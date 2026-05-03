import os
import asyncio
import logging
import base64
from datetime import datetime, date as date_type
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models import User, FoodLog, ActivityLog, HealthMetric, DailySnapshot
from app.parser import parse_log_message
from app.budget import recalculate_daily_snapshot
from app.utils import get_user_today, get_user_local_date

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_user_by_telegram(username: str, session: AsyncSession) -> User | None:
    if not username: return None
    result = await session.execute(select(User).where(User.telegram_username == username))
    return result.scalars().first()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    username = update.message.from_user.username
    await update.message.reply_text(f"Welcome to Altus! I'm your AI Coach. Make sure your Telegram username (@{username}) is entered in your Altus settings so I know who you are.\n\nYou can log food/activity by typing naturally, or send /status to get your current budget.")

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    username = update.message.from_user.username
    async with async_session_maker() as session:
        user = await get_user_by_telegram(username, session)
        if not user:
            await update.message.reply_text("I don't recognize your username. Please set it in your Altus settings.")
            return

        today = get_user_today(user)
        await recalculate_daily_snapshot(user.id, today, session)
        await session.commit()
        
        stmt = select(DailySnapshot).where(DailySnapshot.user_id == user.id, DailySnapshot.date == today)
        snap = (await session.execute(stmt)).scalars().first()
        
        if not snap:
            await update.message.reply_text(f"No data for today ({today}). Start logging to see your balance!")
            return
            
        balance = round(snap.balance_kcal)
        consumed = round(snap.consumed_kcal)
        burned = round(snap.burned_kcal)
        budget = round(snap.budget_kcal)
        
        status_msg = (
            f"📊 *Status for {today}*\n\n"
            f"💰 *Remaining:* {balance} kcal\n"
            f"🎯 *Budget:* {budget} kcal\n"
            f"🍱 *Consumed:* {consumed} kcal\n"
            f"🏃 *Burned:* {burned} kcal\n\n"
            f"🥩 P: {round(snap.protein_g)}g  |  🍝 C: {round(snap.carbs_g)}g  |  🥑 F: {round(snap.fat_g)}g"
        )
        await update.message.reply_text(status_msg, parse_mode='Markdown')

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    username = update.message.from_user.username
    text = update.message.text
    photo = None
    
    if update.message.photo:
        photo = update.message.photo[-1] # Largest photo
        text = update.message.caption or ""

    if not text and not photo:
        return

    async with async_session_maker() as session:
        user = await get_user_by_telegram(username, session)
        if not user:
            await update.message.reply_text("I don't recognize your username. Please set it in your Altus settings.")
            return

        image_b64 = None
        if photo:
            file = await context.bot.get_file(photo.file_id)
            image_bytes = await file.download_as_bytearray()
            image_b64 = base64.b64encode(image_bytes).decode('utf-8')

        await update.message.reply_text("Thinking...")

        try:
            parsed = await parse_log_message(
                message=text, 
                api_key=user.llm_api_key, 
                provider=user.llm_provider,
                image_b64=image_b64
            )
            
            logs = parsed.get("logs", [])
            handoff = parsed.get("handoff", False)
            
            logs_created = []
            for item in logs:
                if item["type"] == "food":
                    log = FoodLog(
                        user_id=user.id,
                        timestamp=datetime.utcnow(),
                        meal_slot=item["meal_slot"],
                        description=item["description"],
                        kcal=item["kcal"],
                        protein_g=item["protein_g"],
                        carbs_g=item["carbs_g"],
                        fat_g=item["fat_g"],
                        alcohol_g=item.get("alcohol_g"),
                        sodium_mg=item.get("sodium_mg"),
                        caffeine_mg=item.get("caffeine_mg"),
                        hydration_ml=item.get("hydration_ml"),
                        iron_mg=item.get("iron_mg"),
                        calcium_mg=item.get("calcium_mg"),
                        potassium_mg=item.get("potassium_mg")
                    )
                    session.add(log)
                    logs_created.append(f"Logged {item['description']} ({item['kcal']} kcal)")
                elif item["type"] == "activity":
                    log = ActivityLog(
                        user_id=user.id,
                        timestamp=datetime.utcnow(),
                        type=item["activity_type"],
                        duration_min=item["duration_min"],
                        kcal_burned=item["kcal_burned"]
                    )
                    session.add(log)
                    logs_created.append(f"Logged {item['activity_type']} (-{item['kcal_burned']} kcal)")
                elif item["type"] == "health":
                    log = HealthMetric(
                        user_id=user.id,
                        timestamp=datetime.utcnow(),
                        weight_kg=item.get("weight_kg"),
                        hrv=item.get("hrv"),
                        rhr=item.get("rhr"),
                        sleep_hours=item.get("sleep_hours"),
                        sleep_quality=item.get("sleep_quality"),
                        sleep_score=item.get("sleep_score"),
                        source="telegram"
                    )
                    session.add(log)
                    logs_created.append("Logged health metric")

            if logs_created:
                await session.commit()
                log_local_date = get_user_local_date(datetime.utcnow(), user)
                await recalculate_daily_snapshot(user.id, log_local_date, session)
                await session.commit()
                await update.message.reply_text("\n".join(logs_created))
            elif not handoff:
                await update.message.reply_text("I couldn't parse any logs from that. Try being more specific.")
            
            if handoff:
                # Simple fallback for chat without a sophisticated conversational chain here
                await update.message.reply_text("I recorded your logs. For more detailed advice, please use the web dashboard.")

        except Exception as e:
            logger.error(f"Error parsing log: {e}")
            await update.message.reply_text("Sorry, I ran into an error processing that.")

if __name__ == '__main__':
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("No TELEGRAM_BOT_TOKEN provided.")
        exit(1)
        
    app = ApplicationBuilder().token(token).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(MessageHandler(filters.TEXT | filters.PHOTO, handle_message))
    
    logger.info("Starting Telegram Bot...")
    app.run_polling()
