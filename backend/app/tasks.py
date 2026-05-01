import os
import json
import uuid
import asyncio
from datetime import datetime, date as date_type, timedelta
from celery import Celery
from sqlmodel import select, Session
from sqlalchemy import func
from app.database import engine
from app.models import User, UserGoal, FoodLog, ActivityLog, HealthMetric, DailySnapshot
from app.llm import LLMClient

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
DIGEST_DIR = "/digests"

app = Celery("altus", broker=REDIS_URL, backend=REDIS_URL)

app.conf.beat_schedule = {
    "generate-digests-every-4-hours": {
        "task": "app.tasks.run_all_digests",
        "schedule": timedelta(hours=4),
    },
}

from app.utils import get_user_now, get_user_today, get_user_local_date, get_utc_range_for_date

@app.task
def run_all_digests():
    # Sync wrapper to run async task
    asyncio.run(_run_all_digests())

async def _run_all_digests():
    from app.database import AsyncSession
    async with AsyncSession(engine) as session:
        stmt = select(User.id)
        result = await session.execute(stmt)
        user_ids = result.scalars().all()
        
        for uid in user_ids:
            await generate_digest_internal(uid, session)

@app.task
def generate_digest(user_id: str):
    uid = uuid.UUID(user_id)
    asyncio.run(_generate_digest_wrapper(uid))

async def _generate_digest_wrapper(user_id: uuid.UUID):
    from app.database import AsyncSession
    async with AsyncSession(engine) as session:
        await generate_digest_internal(user_id, session)

async def generate_digest_internal(user_id: uuid.UUID, db):
    # 1. User Profile & Goal
    user = await db.get(User, user_id)
    goal_stmt = select(UserGoal).where(UserGoal.user_id == user_id).order_by(UserGoal.updated_at.desc())
    goal = (await db.execute(goal_stmt)).scalars().first()
    
    # Timezone handling
    today = get_user_today(user)
    now_user = get_user_now(user)
    age = now_user.year - user.birth_year
    
    # 2. Last 7 Days Aggregation
    seven_days_ago = today - timedelta(days=7)
    snap_stmt = select(DailySnapshot).where(DailySnapshot.user_id == user_id, DailySnapshot.date >= seven_days_ago)
    snaps = (await db.execute(snap_stmt)).scalars().all()
    
    avg_kcal = sum(s.consumed_kcal for s in snaps) / len(snaps) if snaps else 0
    avg_burned = sum(s.burned_kcal for s in snaps) / len(snaps) if snaps else 0
    avg_balance = sum(s.balance_kcal for s in snaps) / len(snaps) if snaps else 0
    adherence = (len([s for s in snaps if abs(s.balance_kcal) <= 200]) / len(snaps) * 100) if snaps else 0
    
    best_day = max(snaps, key=lambda s: -abs(s.balance_kcal)).date.isoformat() if snaps else None
    worst_day = max(snaps, key=lambda s: abs(s.balance_kcal)).date.isoformat() if snaps else None
    
    # 3. Today UTC Range
    start_dt, _ = get_utc_range_for_date(today, user.timezone)
    
    today_snap_stmt = select(DailySnapshot).where(DailySnapshot.user_id == user_id, DailySnapshot.date == today)
    today_snap = (await db.execute(today_snap_stmt)).scalars().first()
    
    food_stmt = select(FoodLog).where(FoodLog.user_id == user_id, FoodLog.timestamp >= start_dt)
    today_foods = (await db.execute(food_stmt)).scalars().all()
    
    # 4. Health Trends
    health_stmt = select(HealthMetric).where(HealthMetric.user_id == user_id).order_by(HealthMetric.timestamp.desc())
    health_metrics = (await db.execute(health_stmt)).scalars().all()
    latest_weight = next((h.weight_kg for h in health_metrics if h.weight_kg), None)
    
    # 5. LLM Notes
    llm = LLMClient()
    context_summary = f"User is {age}yo {user.sex}. Last 7 days avg balance: {avg_balance} kcal. Adherence: {adherence}%."
    system_prompt = "You are Altus.Coach. Analyze the user's data and provide 2-4 plain English observations (max 20 words each). Be brief and objective."
    try:
        patterns_notes_str = await llm.complete(context_summary, system_prompt)
        notes = [n.strip() for n in patterns_notes_str.split('\n') if n.strip()][:4]
    except:
        notes = ["Data looks stable.", "Keep logging consistently."]

    # 6. Build Digest
    digest = {
        "generated_at": datetime.utcnow().isoformat(),
        "user_profile": {
            "age": age, "sex": user.sex, "height_cm": user.height_cm,
            "goal": {
                "direction": goal.direction if goal else "maintain",
                "weekly_rate_kg": goal.weekly_rate_kg if goal else 0,
                "target_kcal": goal.target_kcal if goal else 2000
            }
        },
        "last_7_days": {
            "avg_kcal_consumed": avg_kcal,
            "avg_kcal_burned": avg_burned,
            "avg_balance": avg_balance,
            "adherence_pct": adherence,
            "best_day": best_day,
            "worst_day": worst_day,
            "macro_averages": {
                "protein_g": sum(s.protein_g for s in snaps) / len(snaps) if snaps else 0,
                "carbs_g": sum(s.carbs_g for s in snaps) / len(snaps) if snaps else 0,
                "fat_g": sum(s.fat_g for s in snaps) / len(snaps) if snaps else 0,
            }
        },
        "today": {
            "date": today.isoformat(),
            "consumed_kcal": today_snap.consumed_kcal if today_snap else 0,
            "burned_kcal": today_snap.burned_kcal if today_snap else 0,
            "balance_kcal": today_snap.balance_kcal if today_snap else 0,
            "entries": [{"slot": f.meal_slot, "description": f.description, "kcal": f.kcal, "protein_g": f.protein_g} for f in today_foods]
        },
        "health_trends": {
            "latest_weight_kg": latest_weight,
            "avg_hrv_7d": sum(h.hrv for h in health_metrics[:7] if h.hrv) / 7 if len(health_metrics) >= 7 else None,
        },
        "patterns": { "notes": notes },
        "staleness_flags": []
    }
    
    # Write to file
    os.makedirs(DIGEST_DIR, exist_ok=True)
    with open(f"{DIGEST_DIR}/{user_id}.json", "w") as f:
        json.dump(digest, f, indent=2)
    
    print(f"Digest generated for {user_id}")
