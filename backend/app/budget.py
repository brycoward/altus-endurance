import uuid
from datetime import date as date_type, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models import User, UserGoal, FoodLog, ActivityLog, HealthMetric, DailySnapshot, SexEnum

from app.utils import get_user_now, get_user_today, get_utc_range_for_date

def calculate_bmr(weight_kg: float, height_cm: float, age: int, sex: SexEnum) -> float:
    if sex == SexEnum.M:
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    else:
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161

async def get_latest_weight(user_id: uuid.UUID, db: AsyncSession) -> float:
    # Get latest health metric with weight
    statement = select(HealthMetric).where(HealthMetric.user_id == user_id).where(HealthMetric.weight_kg != None).order_by(HealthMetric.timestamp.desc())
    result = await db.execute(statement)
    metric = result.scalars().first()
    return metric.weight_kg if metric else 75.0 # Default fallback

async def recalculate_daily_snapshot(user_id: uuid.UUID, date: date_type, db: AsyncSession):
    # 1. Fetch User and Goal
    user_stmt = select(User).where(User.id == user_id)
    user = (await db.execute(user_stmt)).scalars().first()

    if not user:
        print(f"User {user_id} not found in recalculate_daily_snapshot")
        return

    # Determine timezone and range
    start_dt, end_dt = get_utc_range_for_date(date, user.timezone)
    
    goal_stmt = select(UserGoal).where(UserGoal.user_id == user_id).order_by(UserGoal.updated_at.desc())
    goal = (await db.execute(goal_stmt)).scalars().first()
    
    # 2. Calculate TDEE and Target
    now_user = get_user_now(user)
    age = now_user.year - user.birth_year
    latest_weight = await get_latest_weight(user_id, db)
    
    if user.bmr_override:
        tdee = user.bmr_override
    else:
        bmr = calculate_bmr(latest_weight, user.height_cm, age, user.sex)
        tdee = bmr * user.activity_multiplier
    
    if goal:
        modifier = goal.weekly_rate_kg * 1100
        target = tdee + modifier
        # Update goal if needed (computed)
        goal.tdee_estimate = tdee
        goal.target_kcal = target
        db.add(goal)
    else:
        target = tdee
        
    # 3. Sum Logs for the day using UTC range
    food_stmt = select(FoodLog).where(FoodLog.user_id == user_id).where(FoodLog.timestamp >= start_dt).where(FoodLog.timestamp <= end_dt)
    foods = (await db.execute(food_stmt)).scalars().all()
    
    act_stmt = select(ActivityLog).where(ActivityLog.user_id == user_id).where(ActivityLog.timestamp >= start_dt).where(ActivityLog.timestamp <= end_dt)
    acts = (await db.execute(act_stmt)).scalars().all()
    
    consumed_kcal = sum(f.kcal for f in foods)
    protein_g = sum(f.protein_g for f in foods)
    carbs_g = sum(f.carbs_g for f in foods)
    fat_g = sum(f.fat_g for f in foods)
    
    # Advanced metrics (filter out Nones)
    fiber_g = sum(f.fiber_g or 0 for f in foods)
    sodium_mg = sum(f.sodium_mg or 0 for f in foods)
    alcohol_g = sum(f.alcohol_g or 0 for f in foods)
    caffeine_mg = sum(f.caffeine_mg or 0 for f in foods)
    hydration_ml = sum(f.hydration_ml or 0 for f in foods)
    iron_mg = sum(f.iron_mg or 0 for f in foods)
    calcium_mg = sum(f.calcium_mg or 0 for f in foods)
    potassium_mg = sum(f.potassium_mg or 0 for f in foods)
    
    burned_kcal = sum(a.kcal_burned for a in acts)
    
    # 4. Update Snapshot
    snap_stmt = select(DailySnapshot).where(DailySnapshot.user_id == user_id, DailySnapshot.date == date)
    snapshot = (await db.execute(snap_stmt)).scalars().first()
    
    if not snapshot:
        snapshot = DailySnapshot(user_id=user_id, date=date)
        
    snapshot.budget_kcal = target
    snapshot.consumed_kcal = consumed_kcal
    snapshot.burned_kcal = burned_kcal
    snapshot.net_kcal = consumed_kcal - burned_kcal
    snapshot.balance_kcal = target - snapshot.net_kcal
    snapshot.protein_g = protein_g
    snapshot.carbs_g = carbs_g
    snapshot.fat_g = fat_g
    snapshot.fiber_g = fiber_g
    snapshot.sodium_mg = sodium_mg
    snapshot.alcohol_g = alcohol_g
    snapshot.caffeine_mg = caffeine_mg
    snapshot.hydration_ml = hydration_ml
    snapshot.iron_mg = iron_mg
    snapshot.calcium_mg = calcium_mg
    snapshot.potassium_mg = potassium_mg
    snapshot.weight_kg = latest_weight
    
    db.add(snapshot)

