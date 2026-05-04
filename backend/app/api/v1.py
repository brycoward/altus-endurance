import uuid
import os
import json
import base64
from datetime import date as date_type, datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_db
from app.llm import LLMClient
from app.models import (
    User, UserGoal, FoodLog, ActivityLog, HealthMetric, 
    DailySnapshot, MealSlot, GoalDirection, SexEnum,
    EnduranceGoal, WeeklyPlanner, PlannedWorkout, ZoneMetrics, UserPhysiology,
    FitnessSignature, ActivityStress, DailyLoad, FitnessGoal
)
from app.budget import recalculate_daily_snapshot
from pydantic import BaseModel, validator
import pytz
from app.auth import get_current_user

router = APIRouter()

from app.utils import get_user_now, get_user_today, get_user_local_date, get_utc_range_for_date
from app.fit_parser import FitParser
from app.endurance_engine import EnduranceEngine, calculate_readiness
from app.fitness_engine import calculate_mpa, calculate_ftp_from_df, calculate_hie, classify_stress, detect_breakthrough, apply_decay, recalc_daily_load
import tempfile

# --- Schemas ---



class FoodCreate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    timestamp: Optional[datetime] = None
    meal_slot: MealSlot
    description: str
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    alcohol_g: Optional[float] = None
    caffeine_mg: Optional[float] = None
    hydration_ml: Optional[float] = None
    iron_mg: Optional[float] = None
    calcium_mg: Optional[float] = None
    potassium_mg: Optional[float] = None

class ActivityCreate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    timestamp: Optional[datetime] = None
    type: str
    duration_min: int
    kcal_burned: float
    notes: Optional[str] = None

class HealthCreate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    timestamp: Optional[datetime] = None
    weight_kg: Optional[float] = None
    hrv: Optional[float] = None
    rhr: Optional[int] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    sleep_score: Optional[int] = None
    source: Optional[str] = None

class HealthUpdate(BaseModel):
    weight_kg: Optional[float] = None
    hrv: Optional[float] = None
    rhr: Optional[int] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    sleep_score: Optional[int] = None
    timestamp: Optional[datetime] = None
    source: Optional[str] = None

class GoalUpdate(BaseModel):
    direction: GoalDirection
    weekly_rate_kg: float
    target_weight_kg: Optional[float] = None
    target_date: Optional[str] = None
    body_fat_pct_target: Optional[float] = None
    notes: Optional[str] = None
    diet_approach: Optional[str] = None
    eating_window_start: Optional[str] = None
    eating_window_end: Optional[str] = None
    target_protein_g: Optional[float] = None
    target_carbs_g: Optional[float] = None
    target_fat_g: Optional[float] = None
    target_fiber_g: Optional[float] = None
    target_hydration_ml: Optional[float] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    birth_year: Optional[int] = None
    height_cm: Optional[float] = None
    sex: Optional[SexEnum] = None
    timezone: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_provider: Optional[str] = None
    # LLM config now comes from .env — these are kept for backward compat but unused
    telegram_username: Optional[str] = None
    bmr_override: Optional[float] = None
    activity_multiplier: Optional[float] = None
    unit_system: Optional[str] = None

    @validator("timezone")
    def validate_timezone(cls, v):
        if v is None:
            return v
        try:
            pytz.timezone(v)
        except Exception:
            raise ValueError("Invalid timezone")
        return v

class FoodUpdate(BaseModel):
    meal_slot: Optional[MealSlot] = None
    description: Optional[str] = None
    kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    alcohol_g: Optional[float] = None
    caffeine_mg: Optional[float] = None
    hydration_ml: Optional[float] = None
    iron_mg: Optional[float] = None
    calcium_mg: Optional[float] = None
    potassium_mg: Optional[float] = None

class ActivityUpdate(BaseModel):
    type: Optional[str] = None
    duration_min: Optional[int] = None
    kcal_burned: Optional[float] = None

class ChatRequest(BaseModel):
    user_id: Optional[uuid.UUID] = None
    message: str
    conversation_history: Optional[List[dict]] = []
    is_internal_call: Optional[bool] = False

class EstimateRequest(BaseModel):
    user_id: Optional[uuid.UUID] = None
    text: str

# --- Routes ---

@router.post("/estimate")
async def estimate_entry(request: EstimateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        parsed = await parse_log_message(request.text)
    except Exception as e:
        print(f"Estimate LLM error: {e}")
        parsed = {"logs": [], "handoff": False}
    return parsed


@router.post("/food")
async def create_food_log(data: FoodCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    data_dict = data.dict()
    data_dict["user_id"] = current_user.id
    if data_dict["timestamp"] and data_dict["timestamp"].tzinfo:
        data_dict["timestamp"] = data_dict["timestamp"].astimezone(None).replace(tzinfo=None)
    
    log = FoodLog(**data_dict)
    if not log.timestamp: log.timestamp = datetime.utcnow()
    db.add(log)
    
    log_local_date = get_user_local_date(log.timestamp, current_user)
    await recalculate_daily_snapshot(log.user_id, log_local_date, db)
    await db.commit()
    return {"status": "success", "id": log.id}

@router.post("/activity")
async def create_activity_log(data: ActivityCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    data_dict = data.dict()
    data_dict["user_id"] = current_user.id
    if data_dict["timestamp"] and data_dict["timestamp"].tzinfo:
        data_dict["timestamp"] = data_dict["timestamp"].astimezone(None).replace(tzinfo=None)
        
    log = ActivityLog(**data_dict)
    if not log.timestamp: log.timestamp = datetime.utcnow()
    db.add(log)
    
    log_local_date = get_user_local_date(log.timestamp, current_user)
    await recalculate_daily_snapshot(log.user_id, log_local_date, db)
    await db.commit()
    return {"status": "success", "id": log.id}

@router.post("/health")
async def create_health_log(data: HealthCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    data_dict = data.dict()
    data_dict["user_id"] = current_user.id
    if data_dict["timestamp"] and data_dict["timestamp"].tzinfo:
        data_dict["timestamp"] = data_dict["timestamp"].astimezone(None).replace(tzinfo=None)
        
    log = HealthMetric(**data_dict)
    if not log.timestamp: log.timestamp = datetime.utcnow()
    db.add(log)
    
    log_local_date = get_user_local_date(log.timestamp, current_user)
    await recalculate_daily_snapshot(log.user_id, log_local_date, db)
    await db.commit()
    return {"status": "success", "id": log.id}


@router.put("/food/{food_id}")
async def update_food_log(food_id: int, data: FoodUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = await db.get(FoodLog, food_id)
    if not log or log.user_id != current_user.id: raise HTTPException(status_code=404, detail="Log not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(log, key, value)
    
    db.add(log)
    await db.commit()
    await recalculate_daily_snapshot(log.user_id, log.timestamp.date(), db)
    return {"status": "success"}

@router.delete("/food/{food_id}")
async def delete_food_log(food_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = await db.get(FoodLog, food_id)
    if not log or log.user_id != current_user.id: raise HTTPException(status_code=404, detail="Log not found")
    
    user_id = log.user_id
    log_date = log.timestamp.date()
    
    await db.delete(log)
    await db.commit()
    await recalculate_daily_snapshot(user_id, log_date, db)
    return {"status": "success"}

@router.put("/activity/{activity_id}")
async def update_activity_log(activity_id: int, data: ActivityUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = await db.get(ActivityLog, activity_id)
    if not log or log.user_id != current_user.id: raise HTTPException(status_code=404, detail="Log not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(log, key, value)
    
    db.add(log)
    await db.commit()
    await recalculate_daily_snapshot(log.user_id, log.timestamp.date(), db)
    return {"status": "success"}

@router.delete("/activity/{activity_id}")
async def delete_activity_log(activity_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = await db.get(ActivityLog, activity_id)
    if not log or log.user_id != current_user.id: raise HTTPException(status_code=404, detail="Log not found")
    
    user_id = log.user_id
    log_date = log.timestamp.date()
    
    await db.delete(log)
    await db.commit()
    await recalculate_daily_snapshot(user_id, log_date, db)
    return {"status": "success"}

@router.put("/health/{health_id}")
async def update_health_log(health_id: int, data: HealthUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = await db.get(HealthMetric, health_id)
    if not log or log.user_id != current_user.id: raise HTTPException(status_code=404, detail="Log not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(log, key, value)
    
    db.add(log)
    await db.commit()
    
    log_local_date = get_user_local_date(log.timestamp, current_user)
    await recalculate_daily_snapshot(log.user_id, log_local_date, db)
    return {"status": "success"}

@router.delete("/health/{health_id}")
async def delete_health_log(health_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = await db.get(HealthMetric, health_id)
    if not log or log.user_id != current_user.id: raise HTTPException(status_code=404, detail="Log not found")
    
    user_id = log.user_id
    log_local_date = get_user_local_date(log.timestamp, current_user)
    
    await db.delete(log)
    await db.commit()
    await recalculate_daily_snapshot(user_id, log_local_date, db)
    return {"status": "success"}

@router.get("/health/latest")
async def get_latest_health(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    metrics = ["weight_kg", "hrv", "rhr", "sleep_hours", "sleep_score"]
    latest_values = {}
    
    for metric in metrics:
        stmt = select(HealthMetric).where(
            HealthMetric.user_id == user_id,
            getattr(HealthMetric, metric) != None
        ).order_by(HealthMetric.timestamp.desc())
        m = (await db.execute(stmt)).scalars().first()
        latest_values[metric] = getattr(m, metric) if m else 0
        
    return latest_values

@router.get("/snapshot/today")
async def get_today_snapshot(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    today = get_user_today(current_user)
    # Trigger a recalc to be sure
    await recalculate_daily_snapshot(user_id, today, db)
    stmt = select(DailySnapshot).where(DailySnapshot.user_id == user_id, DailySnapshot.date == today)
    snap = (await db.execute(stmt)).scalars().first()
    if not snap:
        return {"user_id": user_id, "date": today, "balance_kcal": 0}
    return snap

@router.get("/snapshot/history")
async def get_history(days: int = 90, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    today = get_user_today(current_user)
    start_date = today - timedelta(days=days)
    stmt = select(DailySnapshot).where(DailySnapshot.user_id == user_id, DailySnapshot.date >= start_date).order_by(DailySnapshot.date.desc())
    results = (await db.execute(stmt)).scalars().all()
    return results

@router.put("/goal")
async def update_goal(data: GoalUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    user = current_user
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    target_date = None
    if data.target_date:
        try:
            target_date = date_type.fromisoformat(data.target_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid target_date format. Use YYYY-MM-DD")

    goal = UserGoal(
        user_id=user_id,
        direction=data.direction,
        weekly_rate_kg=data.weekly_rate_kg,
        target_weight_kg=data.target_weight_kg,
        target_date=target_date,
        body_fat_pct_target=data.body_fat_pct_target,
        notes=data.notes,
        diet_approach=data.diet_approach,
        eating_window_start=data.eating_window_start,
        eating_window_end=data.eating_window_end,
        target_protein_g=data.target_protein_g,
        target_carbs_g=data.target_carbs_g,
        target_fat_g=data.target_fat_g,
        target_fiber_g=data.target_fiber_g,
        target_hydration_ml=data.target_hydration_ml,
        updated_at=datetime.utcnow()
    )
    db.add(goal)
    await db.commit()
    await recalculate_daily_snapshot(user_id, get_user_today(current_user), db)
    return {"status": "success"}

@router.get("/goal")
async def get_goal(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    stmt = select(UserGoal).where(UserGoal.user_id == user_id).order_by(UserGoal.updated_at.desc())
    goal = (await db.execute(stmt)).scalars().first()
    if not goal: raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.get("/user/me")
async def get_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/user/me")
async def update_user(data: UserUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = current_user
    user_id = user.id
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(user, key, value)
    
    db.add(user)
    await db.commit()
    
    # Recalculate today's snapshot because BMR inputs might have changed
    await recalculate_daily_snapshot(user_id, get_user_today(user), db)
    return {"status": "success"}

@router.get("/journal/today")
async def get_today_journal(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await _get_journal_for_date(current_user, get_user_today(current_user), db)

@router.get("/journal/date/{date_str}")
async def get_date_journal(date_str: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    return await _get_journal_for_date(current_user, dt, db)

async def _get_journal_for_date(user: User, target_date: date_type, db: AsyncSession):
    start_dt, end_dt = get_utc_range_for_date(target_date, user.timezone)
    user_id = user.id
    
    food_stmt = select(FoodLog).where(FoodLog.user_id == user_id, FoodLog.timestamp >= start_dt, FoodLog.timestamp <= end_dt)
    foods = (await db.execute(food_stmt)).scalars().all()
    
    act_stmt = select(ActivityLog).where(ActivityLog.user_id == user_id, ActivityLog.timestamp >= start_dt, ActivityLog.timestamp <= end_dt)
    acts = (await db.execute(act_stmt)).scalars().all()
    
    health_stmt = select(HealthMetric).where(HealthMetric.user_id == user_id, HealthMetric.timestamp >= start_dt, HealthMetric.timestamp <= end_dt).order_by(HealthMetric.timestamp.desc())
    health = (await db.execute(health_stmt)).scalars().all()
    
    return {
        "food": foods,
        "activity": acts,
        "health": health
    }

from app.parser import parse_log_message

async def _get_fitness_signature_context(user_id: uuid.UUID, db: AsyncSession) -> Optional[dict]:
    sig_stmt = select(FitnessSignature).where(FitnessSignature.user_id == user_id)
    signature = (await db.execute(sig_stmt)).scalars().first()
    if not signature:
        return None
    now = datetime.utcnow()
    return {
        "peak_mpa": round(signature.mpa_watts, 1),
        "peak_ftp": round(signature.ftp_watts, 1),
        "peak_hie": round(signature.hie_kj, 1),
        "decayed_mpa": round(apply_decay(signature.mpa_watts, signature.last_mpa_date, signature.decay_half_life_mpa, now), 1),
        "decayed_ftp": round(apply_decay(signature.ftp_watts, signature.last_ftp_date, signature.decay_half_life_ftp, now), 1),
        "decayed_hie": round(apply_decay(signature.hie_kj, signature.last_hie_date, signature.decay_half_life_hie, now), 1),
    }

# --- Chat Placeholders ---

@router.post("/log")
async def chat_log(request: ChatRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Fetch user to get API key and provider
    user = current_user
    user_id = user.id
    
    # 2. Parse natural language (LLM config from .env)
    try:
        parsed = await parse_log_message(request.message)
    except Exception as e:
        print(f"LLM parse error: {e}")
        parsed = {"logs": [], "handoff": False}
    
    logs_created = []
    for item in parsed.get("logs", []):
        if item["type"] == "food":
            log = FoodLog(
                user_id=user_id,
                timestamp=datetime.utcnow(),
                meal_slot=item["meal_slot"],
                description=item["description"],
                kcal=item["kcal"],
                protein_g=item["protein_g"],
                carbs_g=item["carbs_g"],
                fat_g=item["fat_g"],
                fiber_g=item.get("fiber_g"),
                sodium_mg=item.get("sodium_mg"),
                alcohol_g=item.get("alcohol_g"),
                caffeine_mg=item.get("caffeine_mg"),
                hydration_ml=item.get("hydration_ml"),
                iron_mg=item.get("iron_mg"),
                calcium_mg=item.get("calcium_mg"),
                potassium_mg=item.get("potassium_mg")
            )
            db.add(log)
            logs_created.append(f"Logged {item['description']} ({item['kcal']} kcal)")
        elif item["type"] == "activity":
            log = ActivityLog(
                user_id=user_id,
                timestamp=datetime.utcnow(),
                type=item["activity_type"],
                duration_min=item["duration_min"],
                kcal_burned=item["kcal_burned"]
            )
            db.add(log)
            logs_created.append(f"Logged {item['activity_type']} (-{item['kcal_burned']} kcal)")
        elif item["type"] == "health":
            log = HealthMetric(
                user_id=user_id,
                timestamp=datetime.utcnow(),
                weight_kg=item.get("weight_kg"),
                hrv=item.get("hrv"),
                rhr=item.get("rhr"),
                sleep_hours=item.get("sleep_hours"),
                sleep_quality=item.get("sleep_quality"),
                sleep_score=item.get("sleep_score"),
                source="altus.log"
            )
            db.add(log)
            logs_created.append("Logged health metric")

    if logs_created:
        await db.commit()
        await recalculate_daily_snapshot(user_id, get_user_today(user), db)

    reply = "\n".join(logs_created) if logs_created else "I couldn't identify any entries in your message."
    
    # 2. Handoff to Coach if needed
    handoff_data = None
    if parsed.get("handoff"):
        coach_resp = await chat_coach(request, db)
        handoff_data = {
            "note": "User asked a question during logging.",
            "forwarded_reply": coach_resp["reply"]
        }

    return {
        "source": "altus.log",
        "reply": reply,
        "handoff": handoff_data
    }

@router.post("/log/image")
async def chat_log_with_image(
    message: str = Form(""),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = current_user
    user_id = user.id

    image_b64 = None
    if file:
        content = await file.read()
        image_b64 = base64.b64encode(content).decode('utf-8')

    try:
        parsed = await parse_log_message(message, image_b64=image_b64)
    except Exception as e:
        print(f"Log/image LLM error: {e}")
        parsed = {"logs": [], "handoff": False}

    logs_created = []
    for item in parsed.get("logs", []):
        if item["type"] == "food":
            log = FoodLog(
                user_id=user_id,
                timestamp=datetime.utcnow(),
                meal_slot=item["meal_slot"],
                description=item["description"],
                kcal=item["kcal"],
                protein_g=item["protein_g"],
                carbs_g=item["carbs_g"],
                fat_g=item["fat_g"],
                fiber_g=item.get("fiber_g"),
                sodium_mg=item.get("sodium_mg"),
                alcohol_g=item.get("alcohol_g"),
                caffeine_mg=item.get("caffeine_mg"),
                hydration_ml=item.get("hydration_ml"),
                iron_mg=item.get("iron_mg"),
                calcium_mg=item.get("calcium_mg"),
                potassium_mg=item.get("potassium_mg")
            )
            db.add(log)
            logs_created.append(f"Logged {item['description']} ({item['kcal']} kcal)")
        elif item["type"] == "activity":
            log = ActivityLog(
                user_id=user_id,
                timestamp=datetime.utcnow(),
                type=item["activity_type"],
                duration_min=item["duration_min"],
                kcal_burned=item["kcal_burned"]
            )
            db.add(log)
            logs_created.append(f"Logged {item['activity_type']} (-{item['kcal_burned']} kcal)")
        elif item["type"] == "health":
            log = HealthMetric(
                user_id=user_id,
                timestamp=datetime.utcnow(),
                weight_kg=item.get("weight_kg"),
                hrv=item.get("hrv"),
                rhr=item.get("rhr"),
                sleep_hours=item.get("sleep_hours"),
                sleep_quality=item.get("sleep_quality"),
                sleep_score=item.get("sleep_score"),
                source="altus.log"
            )
            db.add(log)
            logs_created.append("Logged health metric")

    if logs_created:
        await db.commit()
        await recalculate_daily_snapshot(user_id, get_user_today(user), db)

    reply = "\n".join(logs_created) if logs_created else "I couldn't identify any entries in your message."

    handoff_data = None
    if parsed.get("handoff"):
        coach_req = ChatRequest(message=message, user_id=user_id)
        coach_resp = await chat_coach(coach_req, db)
        handoff_data = {
            "note": "User asked a question during logging.",
            "forwarded_reply": coach_resp["reply"]
        }

    return {
        "source": "altus.log",
        "reply": reply,
        "handoff": handoff_data
    }

@router.post("/coach")
async def chat_coach(request: ChatRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = current_user
    user_id = user.id

    today = get_user_today(user)
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)

    snap_stmt = select(DailySnapshot).where(
        DailySnapshot.user_id == user_id,
        DailySnapshot.date >= seven_days_ago
    ).order_by(DailySnapshot.date)
    snaps = (await db.execute(snap_stmt)).scalars().all()

    avg_consumed = sum(s.consumed_kcal for s in snaps) / len(snaps) if snaps else 0
    avg_burned = sum(s.burned_kcal for s in snaps) / len(snaps) if snaps else 0
    avg_protein = sum(s.protein_g for s in snaps) / len(snaps) if snaps else 0
    avg_carbs = sum(s.carbs_g for s in snaps) / len(snaps) if snaps else 0
    avg_fat = sum(s.fat_g for s in snaps) / len(snaps) if snaps else 0
    avg_hydration = sum(s.hydration_ml for s in snaps) / len(snaps) if snaps else 0

    goal_stmt = select(UserGoal).where(UserGoal.user_id == user_id).order_by(UserGoal.updated_at.desc())
    goal = (await db.execute(goal_stmt)).scalars().first()

    gap_analysis = {}
    if goal and goal.target_kcal > 0:
        daily_gap = avg_consumed - goal.target_kcal
        protein_target = goal.target_kcal * 0.3 / 4
        carbs_target = goal.target_kcal * 0.4 / 4
        fat_target = goal.target_kcal * 0.3 / 9
        gap_analysis = {
            "target_kcal": goal.target_kcal,
            "avg_consumed_kcal": round(avg_consumed, 0),
            "daily_gap_kcal": round(daily_gap, 0),
            "direction": goal.direction,
            "weekly_rate_target_kg": goal.weekly_rate_kg,
            "protein_gap": round(avg_protein - protein_target, 0) if avg_protein else 0,
            "carbs_gap": round(avg_carbs - carbs_target, 0) if avg_carbs else 0,
            "fat_gap": round(avg_fat - fat_target, 0) if avg_fat else 0,
        }

    health_stmt = select(HealthMetric).where(
        HealthMetric.user_id == user_id,
        HealthMetric.timestamp >= (datetime.utcnow() - timedelta(days=7))
    ).order_by(HealthMetric.timestamp.desc())
    health_metrics = (await db.execute(health_stmt)).scalars().all()
    latest_weight = next((h.weight_kg for h in health_metrics if h.weight_kg), None)

    act_stmt = select(ActivityLog).where(
        ActivityLog.user_id == user_id,
        ActivityLog.timestamp >= (datetime.utcnow() - timedelta(days=7))
    ).order_by(ActivityLog.timestamp.desc())
    recent_acts = (await db.execute(act_stmt)).scalars().all()
    total_activity_kcal = sum(a.kcal_burned for a in recent_acts)

    start_42 = today - timedelta(days=42)
    start_42_dt = datetime.combine(start_42, datetime.min.time())
    all_acts = (await db.execute(select(ActivityLog).where(
        ActivityLog.user_id == user_id, ActivityLog.timestamp >= start_42_dt
    ))).scalars().all()
    act_dicts = []
    for a in all_acts:
        zm_stmt = select(ZoneMetrics).where(ZoneMetrics.activity_id == a.id)
        zm = (await db.execute(zm_stmt)).scalars().first()
        kj = zm.total_kj if zm else (a.kcal_burned * 4.184 * 0.25)
        act_dicts.append({"date": a.timestamp.date(), "total_kj": kj})
    ltw, stw = EnduranceEngine.calculate_rolling_averages(act_dicts)

    sig_stmt = select(FitnessSignature).where(FitnessSignature.user_id == user_id)
    signature = (await db.execute(sig_stmt)).scalars().first()
    fitness_info = None
    if signature:
        now = datetime.utcnow()
        fitness_info = {
            "peak": {"mpa": round(signature.mpa_watts, 1), "ftp": round(signature.ftp_watts, 1), "hie": round(signature.hie_kj, 1)},
            "decayed": {
                "mpa": round(apply_decay(signature.mpa_watts, signature.last_mpa_date, signature.decay_half_life_mpa, now), 1),
                "ftp": round(apply_decay(signature.ftp_watts, signature.last_ftp_date, signature.decay_half_life_ftp, now), 1),
                "hie": round(apply_decay(signature.hie_kj, signature.last_hie_date, signature.decay_half_life_hie, now), 1),
            },
            "last_breakthrough_at": signature.last_breakthrough_at.isoformat() if signature.last_breakthrough_at else None,
        }

    fitness_goal_stmt = select(FitnessGoal).where(
        FitnessGoal.user_id == user_id, FitnessGoal.status == "active"
    )
    active_fitness_goals = (await db.execute(fitness_goal_stmt)).scalars().all()

    fitness_goal_gaps = []
    for fg in active_fitness_goals:
        gap = {
            "type": fg.fitness_type, "overload": fg.overload_method,
            "validation_metric": fg.validation_metric, "target_description": fg.target_description,
            "metric_value": fg.metric_value, "target_value": fg.target_value,
            "metric_unit": fg.metric_unit, "metric_type": fg.metric_type,
            "ramp_rate": fg.ramp_rate, "target_date": fg.target_date.isoformat() if fg.target_date else None,
        }
        if fg.metric_value is not None and fg.target_value is not None:
            gap["current_to_target"] = f"{fg.metric_value} -> {fg.target_value} {fg.metric_unit or ''}"
            if fg.metric_type == "relative" and latest_weight:
                cur_abs = fg.metric_value
                tgt_abs = fg.target_value
                gap["current_wkg"] = round(cur_abs / latest_weight, 2) if cur_abs and latest_weight else None
                gap["target_wkg"] = round(tgt_abs / latest_weight, 2) if tgt_abs and latest_weight else None
                if goal and goal.target_weight_kg:
                    gap["projected_wkg_at_target_weight"] = round(tgt_abs / goal.target_weight_kg, 2)
                    gap["power_needed_at_current_weight"] = round(fg.target_value * latest_weight) if latest_weight else None
        fitness_goal_gaps.append(gap)

    stress_recs = []
    for fg in active_fitness_goals:
        t = fg.fitness_type
        if t == "endurance":
            stress_recs.append({"type": t, "primary": "Low Stress (Z2 - long steady)", "secondary": "High Stress (tempo/SS)", "avoid": "Peak Stress generally not needed"})
        elif t in ("power", "explosiveness"):
            stress_recs.append({"type": t, "primary": "Peak Stress (>2xFTP bursts)", "secondary": "High Stress (VO2max)", "note": "Quality over volume. Fewer sessions, higher intensity."})
        elif t == "strength":
            stress_recs.append({"type": t, "primary": "Peak Stress (maximal effort)", "secondary": "High Stress (threshold)", "note": "Neuromuscular adaptation. Watch TSB."})
        elif t == "speed_skills":
            stress_recs.append({"type": t, "primary": "High cadence Low Stress", "secondary": "High Stress at race cadence", "note": "Technique-focused, not metabolic-load focused."})
        elif t == "flexibility":
            stress_recs.append({"type": t, "primary": "Recovery / mobility work", "secondary": "None", "note": "Independent of training stress. Self-reported metric only."})
        elif t == "breadth":
            stress_recs.append({"type": t, "primary": "Mixed modality Low Stress", "secondary": "Any", "note": "Add other sport types to weekly schedule."})

    load_stmt = select(DailyLoad).where(
        DailyLoad.user_id == user_id
    ).order_by(DailyLoad.date.desc()).limit(14)
    recent_loads = (await db.execute(load_stmt)).scalars().all()
    latest_load = recent_loads[0] if recent_loads else None
    load_info = None
    if latest_load:
        avg_high = sum(l.high_stress_kj for l in recent_loads) / max(len(recent_loads), 1)
        avg_peak = sum(l.peak_stress_kj for l in recent_loads) / max(len(recent_loads), 1)
        load_info = {
            "ctl": latest_load.ctl, "atl": latest_load.atl, "tsb": latest_load.tsb,
            "tsb_status": "Fresh (positive TSB)" if latest_load.tsb > 5 else "Optimal (near zero)" if latest_load.tsb > -10 else "Fatigued (negative TSB)" if latest_load.tsb > -20 else "Overreaching (very negative TSB)",
            "recent_avg_high_stress_kj": round(avg_high, 1),
            "recent_avg_peak_stress_kj": round(avg_peak, 1),
        }

    context = {
        "user_profile": {
            "name": user.name, "age": today.year - user.birth_year if user.birth_year else None,
            "height_cm": user.height_cm, "sex": user.sex.value if hasattr(user.sex, 'value') else user.sex,
        },
        "weight_goal": {
            "direction": goal.direction if goal else "maintain",
            "weekly_rate_kg": goal.weekly_rate_kg if goal else 0,
            "target_weight_kg": goal.target_weight_kg if goal else None,
            "target_date": goal.target_date.isoformat() if goal and goal.target_date else None,
            "latest_weight_kg": latest_weight,
        } if goal else None,
        "diet_targets": {
            "approach": goal.diet_approach if goal and goal.diet_approach else None,
            "eating_window": f"{goal.eating_window_start}-{goal.eating_window_end}" if goal and goal.eating_window_start else None,
            "target_protein_g": goal.target_protein_g if goal else None,
            "target_carbs_g": goal.target_carbs_g if goal else None,
            "target_fat_g": goal.target_fat_g if goal else None,
        } if goal else None,
        "nutrition_gap_analysis": gap_analysis,
        "last_7_days": {
            "avg_consumed_kcal": round(avg_consumed, 0),
            "avg_burned_kcal": round(avg_burned, 0),
            "avg_protein_g": round(avg_protein, 0),
            "avg_carbs_g": round(avg_carbs, 0),
            "avg_fat_g": round(avg_fat, 0),
            "avg_hydration_ml": round(avg_hydration, 0),
            "total_activity_kcal": round(total_activity_kcal, 0),
        },
        "fitness_signature": fitness_info,
        "training_load": {
            "ltw_kj_per_day": round(ltw, 1),
            "stw_kj_per_day": round(stw, 1),
        },
        "ctl_atl_tsb": load_info,
        "active_fitness_goals": fitness_goal_gaps,
        "stress_recommendations": stress_recs,
    }

    llm = LLMClient()
    system_prompt = (
        "You are Altus.Coach, an expert coaching assistant for endurance athletes. "
        "You have access to the athlete's fitness signature (MPA=Max Power, FTP=Threshold, HIE=Anaerobic Capacity), "
        "their current training load (CTL/ATL/TSB), their nutrition data, and their active fitness goals. "
        "The fitness types are: strength, endurance, power, explosiveness, speed_skills, flexibility, breadth. "
        "Each goal has an overload method (frequency/modality/intensity/duration), a validation metric, "
        "a ramp rate (-2=offseason through +4=challenging), and a metric type (absolute or relative/bodyweight). "
        "For relative goals (metric_type=relative), track w/kg progress — an athlete can improve w/kg by building power OR cutting weight. "
        "For strength/power/explosiveness goals, Peak Stress (>2xFTP) is the primary stimulus. "
        "For endurance goals, Low Stress (aerobic Z2) is the primary stimulus, with High Stress (tempo) as secondary. "
        "Provide actionable, specific advice referencing the athlete's actual numbers. "
        "Address all three areas when relevant: nutrition, training, recovery. "
        "Keep responses concise (2-4 short paragraphs). "
        "When TSB is very negative and the athlete is still training hard, warn about overtraining. "
        "When an athlete is cutting weight while pursuing power goals, provide both paths to their w/kg target. "
        f"Athlete data: {json.dumps(context)}"
    )

    try:
        reply = await llm.complete(request.message, system_prompt)
    except Exception as e:
        print(f"Coach LLM error: {e}")
        reply = "Your API key is missing or invalid. Go to Settings and add your LLM API key to use the coach."

    return {
        "source": "altus.coach",
        "reply": reply,
        "handoff": None
    }

# --- Endurance Routes ---

@router.post("/endurance/upload")
async def upload_fit_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    
    stmt_phys = select(UserPhysiology).where(UserPhysiology.user_id == user_id)
    physiology = (await db.execute(stmt_phys)).scalars().first()
    if not physiology:
        physiology = UserPhysiology(user_id=user_id)
        db.add(physiology)
        await db.commit()
        await db.refresh(physiology)
        
    with tempfile.NamedTemporaryFile(delete=False, suffix=".fit") as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name

    try:
        parser = FitParser(temp_file_path, physiology.lt1_power, physiology.lt2_power)
        metrics = parser.parse()
        
        new_lt2 = EnduranceEngine.auto_calibrate_lt2(parser.df)
        if new_lt2 > 0: physiology.lt2_power = new_lt2
        
        new_lt1 = EnduranceEngine.auto_calibrate_lt1(parser.df)
        if new_lt1 > 0: physiology.lt1_power = new_lt1
        
        physiology.last_calibrated = datetime.utcnow()
        db.add(physiology)

        activity = ActivityLog(
            user_id=user_id,
            timestamp=datetime.utcnow(),
            type="Ride",
            duration_min=metrics.get("total_duration_min", 0),
            kcal_burned=(metrics.get("total_kj", 0) / 4.184) * (1 / 0.25) # ~1:1 kJ to kcal roughly
        )
        db.add(activity)
        await db.commit()
        await db.refresh(activity)
        
        zone_metrics = ZoneMetrics(
            activity_id=activity.id,
            z1_time_sec=metrics["z1_time_sec"], z1_avg_power=metrics["z1_avg_power"], z1_kj=metrics["z1_kj"],
            z2_time_sec=metrics["z2_time_sec"], z2_avg_power=metrics["z2_avg_power"], z2_kj=metrics["z2_kj"],
            z3_time_sec=metrics["z3_time_sec"], z3_avg_power=metrics["z3_avg_power"], z3_kj=metrics["z3_kj"],
            z4_time_sec=metrics["z4_time_sec"], z4_avg_power=metrics["z4_avg_power"], z4_kj=metrics["z4_kj"],
            total_kj=metrics["total_kj"]
        )
        db.add(zone_metrics)

        # --- Fitness Signature Pipeline ---
        sig_stmt = select(FitnessSignature).where(FitnessSignature.user_id == user_id)
        signature = (await db.execute(sig_stmt)).scalars().first()
        if not signature:
            signature = FitnessSignature(user_id=user_id)
            db.add(signature)
            await db.commit()
            await db.refresh(signature)

        now = datetime.utcnow()
        decayed_mpa = apply_decay(signature.mpa_watts, signature.last_mpa_date, signature.decay_half_life_mpa, now)
        decayed_ftp = apply_decay(signature.ftp_watts, signature.last_ftp_date, signature.decay_half_life_ftp, now)
        decayed_hie = apply_decay(signature.hie_kj, signature.last_hie_date, signature.decay_half_life_hie, now)

        observed_mpa = calculate_mpa(parser.df)
        observed_ftp = calculate_ftp_from_df(parser.df)
        observed_hie = calculate_hie(parser.df, decayed_ftp if decayed_ftp > 0 else physiology.lt2_power)

        stress = classify_stress(parser.df, decayed_ftp if decayed_ftp > 0 else physiology.lt2_power)

        breakthrough_level, was_breakthrough, new_mpa, new_ftp, new_hie = detect_breakthrough(
            observed_mpa, observed_ftp, observed_hie, decayed_mpa, decayed_ftp, decayed_hie
        )

        if was_breakthrough:
            signature.mpa_watts = new_mpa
            signature.ftp_watts = new_ftp
            signature.hie_kj = new_hie
            if observed_mpa > decayed_mpa:
                signature.last_mpa_date = now
            if observed_ftp > decayed_ftp:
                signature.last_ftp_date = now
            if observed_hie > decayed_hie:
                signature.last_hie_date = now
            signature.last_breakthrough_at = now
            signature.last_breakthrough_level = breakthrough_level
        signature.updated_at = now
        db.add(signature)

        stress_entry = ActivityStress(
            activity_id=activity.id,
            low_stress_kj=stress["low_stress_kj"],
            high_stress_kj=stress["high_stress_kj"],
            peak_stress_kj=stress["peak_stress_kj"],
            observed_mpa=observed_mpa,
            observed_ftp=observed_ftp,
            observed_hie=observed_hie,
            breakthrough_level=breakthrough_level,
            was_breakthrough=was_breakthrough,
        )
        db.add(stress_entry)

        # Recalculate daily load (CTL/ATL/TSB)
        date = activity.timestamp.date()
        prev_load = (await db.execute(select(DailyLoad).where(
            DailyLoad.user_id == user_id, DailyLoad.date < date
        ).order_by(DailyLoad.date.desc()))).scalars().first()
        prev_ctl = prev_load.ctl if prev_load else 0.0
        prev_atl = prev_load.atl if prev_load else 0.0

        current_load = (await db.execute(select(DailyLoad).where(
            DailyLoad.user_id == user_id, DailyLoad.date == date
        ))).scalars().first()

        total_stress = stress["low_stress_kj"] + stress["high_stress_kj"] + stress["peak_stress_kj"]
        load_data = recalc_daily_load(user_id, date, total_stress, stress["low_stress_kj"], stress["high_stress_kj"], stress["peak_stress_kj"], prev_ctl, prev_atl)

        if current_load:
            current_load.daily_stress_kj += total_stress
            current_load.low_stress_kj += stress["low_stress_kj"]
            current_load.high_stress_kj += stress["high_stress_kj"]
            current_load.peak_stress_kj += stress["peak_stress_kj"]
            current_load.ctl = load_data["ctl"]
            current_load.atl = load_data["atl"]
            current_load.tsb = load_data["tsb"]
            db.add(current_load)
        else:
            db.add(DailyLoad(
                user_id=user_id, date=date,
                daily_stress_kj=total_stress,
                low_stress_kj=stress["low_stress_kj"],
                high_stress_kj=stress["high_stress_kj"],
                peak_stress_kj=stress["peak_stress_kj"],
                ctl=load_data["ctl"], atl=load_data["atl"], tsb=load_data["tsb"],
            ))

        await db.commit()
        await recalculate_daily_snapshot(user_id, get_user_today(current_user), db)

        return {
            "status": "success",
            "metrics": metrics,
            "fitness": {
                "observed_mpa": round(observed_mpa, 1),
                "observed_ftp": round(observed_ftp, 1),
                "observed_hie": round(observed_hie, 1),
                "breakthrough_level": breakthrough_level,
                "was_breakthrough": was_breakthrough,
                "decayed_mpa": round(decayed_mpa, 1),
                "decayed_ftp": round(decayed_ftp, 1),
                "decayed_hie": round(decayed_hie, 1),
            },
            "stress": stress,
            "load": load_data,
            "new_lt1": physiology.lt1_power,
            "new_lt2": physiology.lt2_power,
        }
    finally:
        os.unlink(temp_file_path)

@router.get("/endurance/dashboard")
async def get_endurance_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    
    stmt_phys = select(UserPhysiology).where(UserPhysiology.user_id == user_id)
    physiology = (await db.execute(stmt_phys)).scalars().first()
    if not physiology:
        physiology = UserPhysiology(user_id=user_id)
        db.add(physiology)
        await db.commit()
        await db.refresh(physiology)
        
    today = get_user_today(current_user)
    start_42 = today - timedelta(days=42)
    start_42_dt = datetime.combine(start_42, datetime.min.time())
    
    stmt_act = select(ActivityLog).where(ActivityLog.user_id == user_id, ActivityLog.timestamp >= start_42_dt)
    recent_activities = (await db.execute(stmt_act)).scalars().all()
    
    act_dicts = []
    for a in recent_activities:
        stmt_zm = select(ZoneMetrics).where(ZoneMetrics.activity_id == a.id)
        zm = (await db.execute(stmt_zm)).scalars().first()
        kj = zm.total_kj if zm else (a.kcal_burned * 4.184 * 0.25)
        act_dicts.append({
            "date": a.timestamp.date(),
            "total_kj": kj
        })
        
    ltw, stw = EnduranceEngine.calculate_rolling_averages(act_dicts)
    readiness = calculate_readiness(ltw, stw)
    
    stmt_hist = select(ActivityLog, ZoneMetrics).outerjoin(ZoneMetrics).where(ActivityLog.user_id == user_id).order_by(ActivityLog.timestamp.desc()).limit(10)
    history_res = (await db.execute(stmt_hist)).all()
    
    history_data = []
    for act, zm in history_res:
        has_zones = zm is not None
        history_data.append({
            "id": act.id,
            "date": act.timestamp,
            "type": act.type,
            "duration_min": act.duration_min,
            "kcal_burned": act.kcal_burned,
            "source": "fit" if has_zones else "manual",
            "total_kj": zm.total_kj if has_zones else (act.kcal_burned * 4.184 * 0.25),
            "z1_kj": zm.z1_kj if has_zones else 0,
            "z2_kj": zm.z2_kj if has_zones else 0,
            "z3_kj": zm.z3_kj if has_zones else 0,
            "z4_kj": zm.z4_kj if has_zones else 0,
            "z1_avg": zm.z1_avg_power if has_zones else 0,
            "z2_avg": zm.z2_avg_power if has_zones else 0,
            "z3_avg": zm.z3_avg_power if has_zones else 0,
            "z4_avg": zm.z4_avg_power if has_zones else 0,
        })
        
    return {
        "physiology": physiology,
        "ltw": ltw,
        "stw": stw,
        "readiness": readiness,
        "history": history_data
    }

# --- Calendar & Planning Routes ---

class PlannerWorkoutItem(BaseModel):
    date: date_type
    planned_type: str
    planned_duration_min: int = 0
    planned_kj: float = 0.0
    notes: Optional[str] = None

class WeekPlanRequest(BaseModel):
    week_start_date: date_type
    workouts: List[PlannerWorkoutItem]

@router.get("/calendar/week")
async def get_calendar_week(
    date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    user = current_user

    if date:
        target = date_type.fromisoformat(date)
    else:
        target = get_user_today(user)

    week_start = target - timedelta(days=target.weekday())
    week_end = week_start + timedelta(days=6)

    days_data = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_start, day_end = get_utc_range_for_date(day, user.timezone)

        await recalculate_daily_snapshot(user_id, day, db)
        snap_stmt = select(DailySnapshot).where(
            DailySnapshot.user_id == user_id, DailySnapshot.date == day
        )
        snap = (await db.execute(snap_stmt)).scalars().first()

        act_stmt = select(ActivityLog, ZoneMetrics).outerjoin(ZoneMetrics).where(
            ActivityLog.user_id == user_id,
            ActivityLog.timestamp >= day_start,
            ActivityLog.timestamp <= day_end
        ).order_by(ActivityLog.timestamp)
        act_results = (await db.execute(act_stmt)).all()

        activities = []
        act_ids = []
        for act, zm in act_results:
            has_zones = zm is not None
            act_ids.append(act.id)
            activities.append({
                "id": act.id,
                "type": act.type,
                "duration_min": act.duration_min,
                "kcal_burned": act.kcal_burned,
                "source": "fit" if has_zones else "manual",
                "total_kj": zm.total_kj if has_zones else (act.kcal_burned * 4.184 * 0.25),
                "z1_kj": zm.z1_kj if has_zones else 0,
                "z2_kj": zm.z2_kj if has_zones else 0,
                "z3_kj": zm.z3_kj if has_zones else 0,
                "z4_kj": zm.z4_kj if has_zones else 0,
            })

        # Add breakthrough data
        if act_ids:
            stress_results = (await db.execute(select(ActivityStress).where(
                ActivityStress.activity_id.in_(act_ids)
            ))).scalars().all()
            stress_map = {s.activity_id: s for s in stress_results}
            for a in activities:
                s = stress_map.get(a["id"])
                if s:
                    a["breakthrough_level"] = s.breakthrough_level
                    a["was_breakthrough"] = s.was_breakthrough

        planned_stmt = select(PlannedWorkout).where(
            PlannedWorkout.user_id == user_id,
            PlannedWorkout.date == day
        )
        planned = (await db.execute(planned_stmt)).scalars().all()
        planned_workouts = [{
            "id": p.id,
            "planned_type": p.planned_type,
            "planned_duration_min": p.planned_duration_min,
            "planned_kj": p.planned_kj,
            "notes": p.notes,
            "completed": p.completed,
        } for p in planned]

        health_stmt = select(HealthMetric).where(
            HealthMetric.user_id == user_id,
            HealthMetric.timestamp >= day_start,
            HealthMetric.timestamp <= day_end
        ).order_by(HealthMetric.timestamp.desc()).limit(1)
        latest_health = (await db.execute(health_stmt)).scalars().first()

        if snap and snap.budget_kcal > 0:
            adherence = round(max(0, (1.0 - min(abs(snap.balance_kcal) / snap.budget_kcal, 1.0))) * 100, 1)
        else:
            adherence = 0

        days_data.append({
            "date": day.isoformat(),
            "day_name": day.strftime("%a"),
            "is_today": day == get_user_today(user),
            "snapshot": {
                "budget_kcal": snap.budget_kcal if snap else 0,
                "consumed_kcal": snap.consumed_kcal if snap else 0,
                "burned_kcal": snap.burned_kcal if snap else 0,
                "net_kcal": snap.net_kcal if snap else 0,
                "balance_kcal": snap.balance_kcal if snap else 0,
                "protein_g": snap.protein_g if snap else 0,
                "carbs_g": snap.carbs_g if snap else 0,
                "fat_g": snap.fat_g if snap else 0,
                "weight_kg": snap.weight_kg if snap else None,
            },
            "adherence_pct": adherence,
            "activities": activities,
            "planned_workouts": planned_workouts,
            "biometrics": {
                "weight_kg": latest_health.weight_kg if latest_health else None,
                "rhr": latest_health.rhr if latest_health else None,
                "hrv": latest_health.hrv if latest_health else None,
                "sleep_hours": latest_health.sleep_hours if latest_health else None,
                "sleep_score": latest_health.sleep_score if latest_health else None,
            } if latest_health and any([
                latest_health.weight_kg, latest_health.rhr, latest_health.hrv,
                latest_health.sleep_hours, latest_health.sleep_score
            ]) else None,
        })

    start_42 = target - timedelta(days=42)
    start_42_dt = datetime.combine(start_42, datetime.min.time())
    act_all_stmt = select(ActivityLog).where(
        ActivityLog.user_id == user_id, ActivityLog.timestamp >= start_42_dt
    )
    all_activities = (await db.execute(act_all_stmt)).scalars().all()

    act_dicts = []
    for a in all_activities:
        zm_stmt = select(ZoneMetrics).where(ZoneMetrics.activity_id == a.id)
        zm = (await db.execute(zm_stmt)).scalars().first()
        kj = zm.total_kj if zm else (a.kcal_burned * 4.184 * 0.25)
        act_dicts.append({"date": a.timestamp.date(), "total_kj": kj})

    ltw, stw = EnduranceEngine.calculate_rolling_averages(act_dicts)
    readiness = calculate_readiness(ltw, stw)

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "days": days_data,
        "readiness": {"status": readiness, "ltw": round(ltw, 1), "stw": round(stw, 1)},
    }

@router.post("/planner/week")
async def save_week_plan(
    data: WeekPlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    week_start = data.week_start_date

    existing = (await db.execute(select(PlannedWorkout).where(
        PlannedWorkout.user_id == user_id,
        PlannedWorkout.date >= week_start,
        PlannedWorkout.date < week_start + timedelta(days=7)
    ))).scalars().all()
    for e in existing:
        await db.delete(e)

    for w in data.workouts:
        db.add(PlannedWorkout(
            user_id=user_id,
            date=w.date,
            planned_type=w.planned_type,
            planned_duration_min=w.planned_duration_min,
            planned_kj=w.planned_kj,
            notes=w.notes,
        ))

    await db.commit()
    return {"status": "success", "count": len(data.workouts)}

@router.get("/planner/week")
async def get_week_plan(
    date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    user = current_user

    if date:
        target = date_type.fromisoformat(date)
    else:
        target = get_user_today(user)

    week_start = target - timedelta(days=target.weekday())

    stmt = select(PlannedWorkout).where(
        PlannedWorkout.user_id == user_id,
        PlannedWorkout.date >= week_start,
        PlannedWorkout.date < week_start + timedelta(days=7)
    ).order_by(PlannedWorkout.date)
    results = (await db.execute(stmt)).scalars().all()

    workouts = [{
        "id": r.id, "date": r.date.isoformat(),
        "planned_type": r.planned_type,
        "planned_duration_min": r.planned_duration_min,
        "planned_kj": r.planned_kj,
        "notes": r.notes, "completed": r.completed,
    } for r in results]

    return {
        "week_start": week_start.isoformat(),
        "workouts": workouts,
    }

@router.post("/planner/generate")
async def generate_week_plan(
    date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = current_user
    user_id = user.id

    latest_weight = 75
    health_stmt = select(HealthMetric).where(
        HealthMetric.user_id == user_id, HealthMetric.weight_kg != None
    ).order_by(HealthMetric.timestamp.desc())
    hm = (await db.execute(health_stmt)).scalars().first()
    if hm:
        latest_weight = hm.weight_kg

    user_context = {
        "name": user.name,
        "age": (get_user_today(user).year - user.birth_year) if user.birth_year else None,
        "height_cm": user.height_cm,
        "sex": user.sex.value if hasattr(user.sex, 'value') else user.sex,
        "latest_weight_kg": latest_weight,
        "current_goal": {
            "direction": current_goal.direction if current_goal else None,
            "weekly_rate_kg": current_goal.weekly_rate_kg if current_goal else 0,
            "target_weight_kg": current_goal.target_weight_kg if current_goal else None,
            "target_date": current_goal.target_date.isoformat() if current_goal and current_goal.target_date else None,
            "body_fat_pct_target": current_goal.body_fat_pct_target if current_goal else None,
            "notes": current_goal.notes if current_goal else None,
        } if current_goal else None,
        "endurance_goal": {
            "target_event_kj": endurance_goal.target_event_kj if endurance_goal else None,
            "lt1_power": physiology.lt1_power if physiology else None,
            "lt2_power": physiology.lt2_power if physiology else None,
        } if endurance_goal or physiology else None,
        "fitness_signature": (await _get_fitness_signature_context(user_id, db)) if user_id else None,
    }

    llm = LLMClient()
    system_prompt = (
        "You are Altus.Goals, a goal-setting coach for endurance athletes. "
        "Help the user establish clear, measurable goals for body composition and performance. "
        "You have access to their current fitness signature (MPA=max power, FTP=threshold, HIE=anaerobic capacity) "
        "which shows their current capability and decay status. "
        "The 7 fitness types are: strength (maximal force), endurance (sustained aerobic), "
        "power (rate of high-intensity work), explosiveness (rate of force development), "
        "speed_skills (technique at velocity), flexibility (range of motion), breadth (cross-discipline). "
        "For each fitness goal, identify: fitness_type, overload_method (frequency/modality/intensity/duration), "
        "validation_metric (what you'll track), current and target descriptions, metric values with units. "
        "Use metric_type='absolute' for raw values (e.g. 280W) or 'relative' for bodyweight-dependent (e.g. 4.0 w/kg). "
        "For relative goals, note that the athlete can improve by building power OR cutting weight. "
        "Suggest a ramp_rate (-2=offseason through +4=challenging) appropriate for the goal type. "
        "Ask one or two questions at a time. When you have enough information, wrap your response "
        "with a structured proposal block using this format:\n"
        "---GOALS---\n"
        '{"direction": "lose"|"maintain"|"gain", "weekly_rate_kg": float, '
        '"target_weight_kg": float|null, "body_fat_pct_target": float|null, '
        '"target_date": "YYYY-MM-DD"|null, "notes": string}\n'
        "---END---\n"
        "If the user seems to set an endurance performance goal, include:\n"
        "---ENDURANCE---\n"
        '{"target_event_kj": float|null, "hardest_section_power": float|null, '
        '"hardest_section_duration_min": float|null, "sprint_capability_sec": int|null, '
        '"recovery_demand": "Low"|"Average"|"High"|null, "ramp_rate": float|null}\n'
        "---END---\n"
        "If the user discusses a specific fitness goal, include:\n"
        "---FITNESS---\n"
        '{"fitness_type": "strength"|"endurance"|"power"|"explosiveness"|"speed_skills"|"flexibility"|"breadth", '
        '"overload_method": "frequency"|"modality"|"intensity"|"duration", '
        '"validation_metric": string, "current_description": string|null, "target_description": string, '
        '"metric_value": float|null, "target_value": float|null, "metric_unit": string|null, '
        '"metric_type": "absolute"|"relative", '
        '"ramp_rate": int (0=maintenance, 1=slow, 2=moderate, 3=aggressive, 4=challenging, -1=taper, -2=offseason)}\n'
        "---END---\n"
        "Keep the conversational reply conversational, not JSON."
    )

    prompt = f"User context: {json.dumps(user_context)}\n\nUser message: {request.message}"
    reply = await llm.complete(prompt, system_prompt)

    goal_data = None
    endurance_data = None

    if "---GOALS---" in reply:
        parts = reply.split("---GOALS---")
        try:
            goal_json = parts[1].split("---END---")[0].strip()
            goal_data = json.loads(goal_json)
        except (IndexError, json.JSONDecodeError):
            pass
        reply = parts[0].strip()

    if "---ENDURANCE---" in reply:
        parts = reply.split("---ENDURANCE---")
        try:
            end_json = parts[1].split("---END---")[0].strip()
            endurance_data = json.loads(end_json)
        except (IndexError, json.JSONDecodeError):
            pass
        reply = reply.split("---ENDURANCE---")[0].strip()

    fitness_goal_data = None
    if "---FITNESS---" in reply:
        parts = reply.split("---FITNESS---")
        try:
            fitness_json = parts[1].split("---END---")[0].strip()
            fitness_goal_data = json.loads(fitness_json)
        except (IndexError, json.JSONDecodeError):
            pass
        reply = reply.split("---FITNESS---")[0].strip()

    return {
        "source": "altus.goals",
        "reply": reply,
        "goal_data": goal_data,
        "endurance_goal_data": endurance_data,
        "fitness_goal_data": fitness_goal_data,
    }


@router.get("/goals/fitness")
async def list_fitness_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    stmt = select(FitnessGoal).where(
        FitnessGoal.user_id == user_id
    ).order_by(FitnessGoal.created_at.desc())
    goals = (await db.execute(stmt)).scalars().all()
    return goals


@router.post("/goals/fitness")
async def create_fitness_goal(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    target_date = None
    if data.get("target_date"):
        try:
            target_date = date_type.fromisoformat(data["target_date"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid target_date format")

    goal = FitnessGoal(
        user_id=user_id,
        fitness_type=data.get("fitness_type", ""),
        overload_method=data.get("overload_method", "intensity"),
        validation_metric=data.get("validation_metric", ""),
        current_description=data.get("current_description"),
        target_description=data.get("target_description", ""),
        metric_value=data.get("metric_value"),
        target_value=data.get("target_value"),
        metric_unit=data.get("metric_unit"),
        metric_type=data.get("metric_type", "absolute"),
        target_date=target_date,
        ramp_rate=data.get("ramp_rate", 0),
        diet_approach=data.get("diet_approach"),
        eating_window_start=data.get("eating_window_start"),
        eating_window_end=data.get("eating_window_end"),
        status=data.get("status", "active"),
        notes=data.get("notes"),
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.put("/goals/fitness/{goal_id}")
async def update_fitness_goal(
    goal_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = await db.get(FitnessGoal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    for key in ["fitness_type", "overload_method", "validation_metric",
                 "current_description", "target_description",
                 "metric_value", "target_value", "metric_unit", "metric_type",
                 "ramp_rate", "diet_approach", "status", "notes",
                 "eating_window_start", "eating_window_end"]:
        val = data.get(key)
        if val is not None:
            setattr(goal, key, val)

    if data.get("target_date") is not None:
        if data["target_date"]:
            goal.target_date = date_type.fromisoformat(data["target_date"])
        else:
            goal.target_date = None

    goal.updated_at = datetime.utcnow()
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/goals/fitness/{goal_id}")
async def delete_fitness_goal(
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = await db.get(FitnessGoal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
    return {"status": "deleted"}


@router.get("/endurance/goal")
async def get_endurance_goal(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    stmt = select(EnduranceGoal).where(EnduranceGoal.user_id == user_id)
    goal = (await db.execute(stmt)).scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Endurance goal not set")
    return goal


@router.put("/endurance/goal")
async def update_endurance_goal(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    stmt = select(EnduranceGoal).where(EnduranceGoal.user_id == user_id)
    goal = (await db.execute(stmt)).scalars().first()

    if not goal:
        goal = EnduranceGoal(user_id=user_id)
        db.add(goal)

    for key in ["target_event_kj", "hardest_section_power", "hardest_section_duration_min",
                 "sprint_capability_sec", "ramp_rate"]:
        val = data.get(key)
        if val is not None:
            setattr(goal, key, val)

    if data.get("recovery_demand"):
        goal.recovery_demand = data["recovery_demand"]

    goal.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "success"}

@router.get("/goals/progress")
async def get_goal_progress(
    days: int = 90,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    user = current_user
    today = get_user_today(user)

    goal_stmt = select(UserGoal).where(UserGoal.user_id == user_id).order_by(UserGoal.updated_at.desc())
    goal = (await db.execute(goal_stmt)).scalars().first()

    start = today - timedelta(days=days)
    health_stmt = select(HealthMetric).where(
        HealthMetric.user_id == user_id,
        HealthMetric.timestamp >= datetime.combine(start, datetime.min.time()),
        HealthMetric.weight_kg != None
    ).order_by(HealthMetric.timestamp)
    weights = (await db.execute(health_stmt)).scalars().all()

    weight_history = []
    for w in weights:
        d = w.timestamp.date()
        weight_history.append({"date": d.isoformat(), "weight_kg": w.weight_kg})

    snap_start = today - timedelta(days=30)
    snap_stmt = select(DailySnapshot).where(
        DailySnapshot.user_id == user_id,
        DailySnapshot.date >= snap_start
    ).order_by(DailySnapshot.date)
    snaps = (await db.execute(snap_stmt)).scalars().all()

    window_7 = [s for s in snaps if s.date >= today - timedelta(days=7)]
    window_30 = snaps

    def avg_window(window, field):
        vals = [getattr(s, field) for s in window if getattr(s, field) is not None]
        return round(sum(vals) / len(vals), 1) if vals else 0

    adherence_7 = avg_window(window_7, "balance_kcal")
    budget_7 = avg_window(window_7, "budget_kcal")
    adherence_pct_7 = round(max(0, 1 - min(abs(adherence_7) / max(budget_7, 1), 1)) * 100, 1) if budget_7 > 0 else 0

    planned_stmt = select(PlannedWorkout).where(
        PlannedWorkout.user_id == user_id,
        PlannedWorkout.date >= today - timedelta(days=today.weekday()),
        PlannedWorkout.date < today - timedelta(days=today.weekday()) + timedelta(days=7)
    )
    planned = (await db.execute(planned_stmt)).scalars().all()
    total_planned = len(planned)
    completed_planned = sum(1 for p in planned if p.completed)

    days_remaining = None
    estimated_date = None
    if goal and goal.target_date:
        days_remaining = (goal.target_date - today).days
    if goal and goal.target_weight_kg and goal.weekly_rate_kg != 0:
        latest_weight = weight_history[-1]["weight_kg"] if weight_history else 75
        remaining_kg = abs(latest_weight - goal.target_weight_kg)
        days_needed = abs(remaining_kg / goal.weekly_rate_kg) * 7 if goal.weekly_rate_kg != 0 else 0
        estimated_date = (today + timedelta(days=int(days_needed))).isoformat() if days_needed > 0 else None

    return {
        "goal": {
            "direction": goal.direction if goal else None,
            "weekly_rate_kg": goal.weekly_rate_kg if goal else 0,
            "target_weight_kg": goal.target_weight_kg if goal else None,
            "target_date": goal.target_date.isoformat() if goal and goal.target_date else None,
            "body_fat_pct_target": goal.body_fat_pct_target if goal else None,
            "notes": goal.notes if goal else None,
        } if goal else None,
        "weight_history": weight_history,
        "latest_weight_kg": weight_history[-1]["weight_kg"] if weight_history else None,
        "adherence": {
            "window_7_days": {"adherence_pct": adherence_pct_7, "avg_balance_kcal": round(adherence_7, 0)},
            "avg_protein_g": avg_window(window_7, "protein_g"),
            "avg_carbs_g": avg_window(window_7, "carbs_g"),
            "avg_fat_g": avg_window(window_7, "fat_g"),
            "avg_hydration_ml": avg_window(window_7, "hydration_ml"),
        },
        "workout_adherence": {
            "planned": total_planned,
            "completed": completed_planned,
            "pct": round(completed_planned / total_planned * 100, 1) if total_planned > 0 else 0,
        },
        "timeline": {
            "days_remaining": days_remaining,
            "estimated_completion_date": estimated_date,
        },
    }

@router.get("/digest/latest")
async def get_latest_digest(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    digest_path = f"/digests/{user_id}.json"

    if not os.path.exists(digest_path):
        return {"exists": False, "message": "No digest available yet. Digests are generated every 4 hours."}

    with open(digest_path, "r") as f:
        digest = json.load(f)

    generated = datetime.fromisoformat(digest["generated_at"])
    is_stale = (datetime.utcnow() - generated) > timedelta(hours=24)

    return {
        "exists": True,
        "is_stale": is_stale,
        "digest": digest,
    }

@router.get("/analysis/dashboard")
async def get_analysis_dashboard(
    days: int = 90,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    user = current_user
    today = get_user_today(user)
    start_date = today - timedelta(days=days)

    # Daily snapshots
    snap_stmt = select(DailySnapshot).where(
        DailySnapshot.user_id == user_id,
        DailySnapshot.date >= start_date
    ).order_by(DailySnapshot.date)
    snaps = (await db.execute(snap_stmt)).scalars().all()
    snap_map = {s.date: s for s in snaps}

    # Activities with zone data
    act_stmt = select(ActivityLog, ZoneMetrics).outerjoin(ZoneMetrics).where(
        ActivityLog.user_id == user_id,
        ActivityLog.timestamp >= datetime.combine(start_date, datetime.min.time())
    ).order_by(ActivityLog.timestamp)
    act_results = (await db.execute(act_stmt)).all()

    daily_acts: dict = {}
    for act, zm in act_results:
        d = act.timestamp.date()
        if d not in daily_acts:
            daily_acts[d] = {"total_kj": 0, "count": 0, "activities": []}
        kj = zm.total_kj if zm else (act.kcal_burned * 4.184 * 0.25)
        daily_acts[d]["total_kj"] += kj
        daily_acts[d]["count"] += 1
        daily_acts[d]["activities"].append({
            "type": act.type, "duration_min": act.duration_min,
            "kcal_burned": act.kcal_burned, "kj": kj,
        })

    # Health metrics
    health_stmt = select(HealthMetric).where(
        HealthMetric.user_id == user_id,
        HealthMetric.timestamp >= datetime.combine(start_date, datetime.min.time())
    ).order_by(HealthMetric.timestamp)
    health_metrics = (await db.execute(health_stmt)).scalars().all()

    daily_health: dict = {}
    for h in health_metrics:
        d = h.timestamp.date()
        if d not in daily_health:
            daily_health[d] = {}
        if h.weight_kg is not None:
            daily_health[d]["weight_kg"] = h.weight_kg
        if h.hrv is not None:
            daily_health[d]["hrv"] = h.hrv
        if h.rhr is not None:
            daily_health[d]["rhr"] = h.rhr
        if h.sleep_hours is not None:
            daily_health[d]["sleep_hours"] = h.sleep_hours

    # Weight regression for projection
    weights = [(d, h["weight_kg"]) for d, h in sorted(daily_health.items()) if "weight_kg" in h]
    weight_projection = None
    if len(weights) >= 5:
        import statistics
        x_vals = [(d - weights[0][0]).days for d, _ in weights]
        y_vals = [w for _, w in weights]
        n = len(x_vals)
        slope = (n * sum(x*y for x, y in zip(x_vals, y_vals)) - sum(x_vals) * sum(y_vals)) / (n * sum(x*x for x in x_vals) - sum(x_vals)**2) if (n * sum(x*x for x in x_vals) - sum(x_vals)**2) != 0 else 0
        intercept = (sum(y_vals) - slope * sum(x_vals)) / n
        projection_dates = [today + timedelta(days=d*7) for d in range(1, 9)]
        weight_projection = {
            "trend_slope_kg_per_day": round(slope, 4),
            "current_trend_kg": round(slope * (today - weights[0][0]).days + intercept, 1),
            "projections": [{"date": d.isoformat(), "weight_kg": round(slope * (d - weights[0][0]).days + intercept, 1)} for d in projection_dates],
        }

    # Build daily time series
    days_data = []
    ltw_values = []
    stw_values = []

    for i in range(days):
        d = start_date + timedelta(days=i)
        snap = snap_map.get(d)

        date_acts = daily_acts.get(d, {"total_kj": 0, "count": 0, "activities": []})
        date_health = daily_health.get(d, {})

        # Rolling averages need 42 days of lookback
        lookback_42 = d - timedelta(days=42)
        kj_sum = sum(
            da["total_kj"] for dd, da in daily_acts.items()
            if lookback_42 <= dd <= d
        )
        ltw = round(kj_sum / 42.0, 1) if i >= 42 else 0

        lookback_7 = d - timedelta(days=7)
        stw = round(
            sum(da["total_kj"] for dd, da in daily_acts.items() if lookback_7 <= dd <= d) / 7.0,
            1
        ) if i >= 7 else 0

        ltw_values.append(ltw)
        stw_values.append(stw)

        days_data.append({
            "date": d.isoformat(),
            "nutrition": {
                "consumed_kcal": snap.consumed_kcal if snap else 0,
                "burned_kcal": snap.burned_kcal if snap else 0,
                "balance_kcal": snap.balance_kcal if snap else 0,
                "protein_g": snap.protein_g if snap else 0,
                "carbs_g": snap.carbs_g if snap else 0,
                "fat_g": snap.fat_g if snap else 0,
            } if snap else None,
            "training": {
                "total_kj": round(date_acts["total_kj"], 1),
                "ltw": ltw,
                "stw": stw,
                "count": date_acts["count"],
                "activities": date_acts["activities"],
            },
            "health": date_health if any(date_health.values()) else None,
        })

    return {
        "days": days_data,
        "weight_projection": weight_projection,
        "summary": {
            "total_days": days,
            "days_with_data": len(snaps),
            "days_with_activity": len([d for d in daily_acts.values() if d["total_kj"] > 0]),
        },
    }

# --- Fitness Signature Endpoints ---

@router.get("/fitness/signature")
async def get_fitness_signature(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    sig_stmt = select(FitnessSignature).where(FitnessSignature.user_id == user_id)
    signature = (await db.execute(sig_stmt)).scalars().first()
    if not signature:
        raise HTTPException(status_code=404, detail="No fitness signature yet. Upload a FIT file.")

    now = datetime.utcnow()
    decayed_mpa = apply_decay(signature.mpa_watts, signature.last_mpa_date, signature.decay_half_life_mpa, now)
    decayed_ftp = apply_decay(signature.ftp_watts, signature.last_ftp_date, signature.decay_half_life_ftp, now)
    decayed_hie = apply_decay(signature.hie_kj, signature.last_hie_date, signature.decay_half_life_hie, now)

    breakthrough_stmt = select(ActivityStress, ActivityLog).join(
        ActivityLog, ActivityStress.activity_id == ActivityLog.id
    ).where(
        ActivityLog.user_id == user_id, ActivityStress.was_breakthrough == True
    ).order_by(ActivityLog.timestamp.desc()).limit(10)
    breakthroughs = (await db.execute(breakthrough_stmt)).all()

    return {
        "peak": {"mpa": round(signature.mpa_watts, 1), "ftp": round(signature.ftp_watts, 1), "hie": round(signature.hie_kj, 1)},
        "decayed": {"mpa": round(decayed_mpa, 1), "ftp": round(decayed_ftp, 1), "hie": round(decayed_hie, 1)},
        "last_breakthrough_at": signature.last_breakthrough_at.isoformat() if signature.last_breakthrough_at else None,
        "last_breakthrough_level": signature.last_breakthrough_level,
        "breakthroughs": [{
            "date": b[1].timestamp.isoformat(),
            "level": b[0].breakthrough_level,
        } for b in breakthroughs],
        "decay_config": {"mpa_half_life_days": signature.decay_half_life_mpa, "ftp_half_life_days": signature.decay_half_life_ftp, "hie_half_life_days": signature.decay_half_life_hie},
    }


@router.get("/fitness/chronic")
async def get_fitness_chronic(
    days: int = 90,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    user = current_user
    today = get_user_today(user)

    start = today - timedelta(days=days)
    load_stmt = select(DailyLoad).where(
        DailyLoad.user_id == user_id, DailyLoad.date >= start
    ).order_by(DailyLoad.date)
    loads = (await db.execute(load_stmt)).scalars().all()

    return [{
        "date": l.date.isoformat(),
        "daily_stress_kj": l.daily_stress_kj,
        "low_stress_kj": l.low_stress_kj,
        "high_stress_kj": l.high_stress_kj,
        "peak_stress_kj": l.peak_stress_kj,
        "ctl": l.ctl, "atl": l.atl, "tsb": l.tsb,
    } for l in loads]


@router.get("/fitness/stress")
async def get_fitness_stress(
    days: int = 90,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    user = current_user
    today = get_user_today(user)
    start = today - timedelta(days=days)

    stress_stmt = select(ActivityStress, ActivityLog).join(
        ActivityLog, ActivityStress.activity_id == ActivityLog.id
    ).where(
        ActivityLog.user_id == user_id,
        ActivityLog.timestamp >= datetime.combine(start, datetime.min.time())
    ).order_by(ActivityLog.timestamp.desc())
    results = (await db.execute(stress_stmt)).all()

    return [{
        "activity_id": r[1].id,
        "date": r[1].timestamp.isoformat(),
        "type": r[1].type,
        "duration_min": r[1].duration_min,
        "low_stress_kj": r[0].low_stress_kj,
        "high_stress_kj": r[0].high_stress_kj,
        "peak_stress_kj": r[0].peak_stress_kj,
        "observed_mpa": r[0].observed_mpa,
        "observed_ftp": r[0].observed_ftp,
        "observed_hie": r[0].observed_hie,
        "breakthrough_level": r[0].breakthrough_level,
        "was_breakthrough": r[0].was_breakthrough,
    } for r in results]
