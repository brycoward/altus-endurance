import uuid
import os
import json
from datetime import date as date_type, datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_db
from app.llm import LLMClient
from app.models import (
    User, UserGoal, FoodLog, ActivityLog, HealthMetric, 
    DailySnapshot, MealSlot, GoalDirection, SexEnum,
    EnduranceGoal, WeeklyPlanner, ZoneMetrics, UserPhysiology
)
from app.budget import recalculate_daily_snapshot
from pydantic import BaseModel, validator
import pytz
from app.auth import get_current_user

router = APIRouter()

from app.utils import get_user_now, get_user_today, get_user_local_date, get_utc_range_for_date
from app.fit_parser import FitParser
from app.endurance_engine import EnduranceEngine, calculate_readiness
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

class GoalUpdate(BaseModel):
    direction: GoalDirection
    weekly_rate_kg: float

class UserUpdate(BaseModel):
    name: Optional[str] = None
    birth_year: Optional[int] = None
    height_cm: Optional[float] = None
    sex: Optional[SexEnum] = None
    timezone: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_provider: Optional[str] = None
    telegram_username: Optional[str] = None
    bmr_override: Optional[float] = None
    activity_multiplier: Optional[float] = None

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
    user = current_user
    llm_key = user.llm_api_key if user else None
    llm_provider = user.llm_provider if user else "anthropic"
    
    parsed = await parse_log_message(request.text, api_key=llm_key, provider=llm_provider)
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
    
    goal = UserGoal(
        user_id=user_id,
        direction=data.direction,
        weekly_rate_kg=data.weekly_rate_kg,
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

# --- Chat Placeholders ---

@router.post("/log")
async def chat_log(request: ChatRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Fetch user to get API key and provider
    user = current_user
    user_id = user.id
    llm_key = user.llm_api_key
    llm_provider = user.llm_provider
    
    # 2. Parse natural language
    parsed = await parse_log_message(request.message, api_key=llm_key, provider=llm_provider)
    
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
                sleep_hours=item.get("sleep_hours")
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

@router.post("/coach")
async def chat_coach(request: ChatRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Load user for key and provider
    user = current_user
    user_id = user.id
    llm_key = user.llm_api_key
    llm_provider = user.llm_provider

    # Load digest for context
    digest_path = f"/digests/{user_id}.json"
    digest = {}
    if os.path.exists(digest_path):
        with open(digest_path, "r") as f:
            digest = json.load(f)
    
    llm = LLMClient(api_key=llm_key, provider=llm_provider)
    system_prompt = f"You are Altus.Coach. You provide performance and nutrition advice based ONLY on the user's digest. Never write to the DB. Digest: {json.dumps(digest)}"
    
    reply = await llm.complete(request.message, system_prompt)
    
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
        await db.commit()

        await recalculate_daily_snapshot(user_id, get_user_today(current_user), db)

        return {"status": "success", "metrics": metrics, "new_lt1": physiology.lt1_power, "new_lt2": physiology.lt2_power}
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
    
    stmt_hist = select(ActivityLog, ZoneMetrics).join(ZoneMetrics).where(ActivityLog.user_id == user_id).order_by(ActivityLog.timestamp.desc()).limit(10)
    history_res = (await db.execute(stmt_hist)).all()
    
    history_data = []
    for act, zm in history_res:
        history_data.append({
            "id": act.id,
            "date": act.timestamp,
            "total_kj": zm.total_kj,
            "z1_kj": zm.z1_kj,
            "z2_kj": zm.z2_kj,
            "z3_kj": zm.z3_kj,
            "z4_kj": zm.z4_kj,
            "z1_avg": zm.z1_avg_power,
            "z2_avg": zm.z2_avg_power,
            "z3_avg": zm.z3_avg_power,
            "z4_avg": zm.z4_avg_power,
        })
        
    return {
        "physiology": physiology,
        "ltw": ltw,
        "stw": stw,
        "readiness": readiness,
        "history": history_data
    }
