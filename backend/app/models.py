import uuid
from enum import Enum
from datetime import datetime, date as date_type
from typing import Optional, Any
from sqlmodel import SQLModel, Field, Column, Relationship, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB

class SexEnum(str, Enum):
    M = "M"
    F = "F"
    Other = "Other"

class GoalDirection(str, Enum):
    lose = "lose"
    maintain = "maintain"
    gain = "gain"

class MealSlot(str, Enum):
    Breakfast = "Breakfast"
    Lunch = "Lunch"
    Dinner = "Dinner"
    Snack = "Snack"
    WorkoutFuel = "WorkoutFuel"

class RecoveryDemand(str, Enum):
    Low = "Low"
    Average = "Average"
    High = "High"

class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    name: str
    birth_year: int
    height_cm: float
    sex: SexEnum = Field(sa_column=Column(SQLEnum(SexEnum)))
    timezone: str = Field(default="UTC")
    is_active: bool = Field(default=True)
    
    # 2FA
    totp_secret: Optional[str] = Field(default=None)
    is_totp_enabled: bool = Field(default=False)
    recovery_codes: Optional[list[str]] = Field(default=None, sa_column=Column(JSONB))

    llm_api_key: Optional[str] = None
    llm_provider: str = Field(default="anthropic")
    # LLM config now comes from .env — user-specific keys removed
    telegram_username: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    bmr_override: Optional[float] = None
    activity_multiplier: float = Field(default=1.2)
    unit_system: str = Field(default="metric")

    goals: list["UserGoal"] = Relationship(back_populates="user")
    food_logs: list["FoodLog"] = Relationship(back_populates="user")
    activity_logs: list["ActivityLog"] = Relationship(back_populates="user")
    health_metrics: list["HealthMetric"] = Relationship(back_populates="user")

    # Endurance Module
    endurance_goal: Optional["EnduranceGoal"] = Relationship(back_populates="user")
    weekly_planners: list["WeeklyPlanner"] = Relationship(back_populates="user")
    planned_workouts: list["PlannedWorkout"] = Relationship(back_populates="user")
    physiology: Optional["UserPhysiology"] = Relationship(back_populates="user")
    fitness_signature: Optional["FitnessSignature"] = Relationship(back_populates="user")
    fitness_goals: list["FitnessGoal"] = Relationship(back_populates="user")

class UserGoal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    direction: GoalDirection = Field(sa_column=Column(SQLEnum(GoalDirection)))
    weekly_rate_kg: float = Field(default=0.0)
    tdee_estimate: float = Field(default=2000.0)
    target_kcal: float = Field(default=2000.0)
    target_weight_kg: Optional[float] = None
    target_date: Optional[date_type] = None
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
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="goals")

class FoodLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    meal_slot: MealSlot = Field(sa_column=Column(SQLEnum(MealSlot)))
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

    user: User = Relationship(back_populates="food_logs")

class ActivityLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    type: str
    duration_min: int
    kcal_burned: float = Field(default=0.0)
    notes: Optional[str] = None
    
    user: User = Relationship(back_populates="activity_logs")
    zone_metrics: Optional["ZoneMetrics"] = Relationship(back_populates="activity")
    stress_metrics: Optional["ActivityStress"] = Relationship(back_populates="activity")

class HealthMetric(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    weight_kg: Optional[float] = None
    hrv: Optional[float] = None
    rhr: Optional[int] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None # 1-10
    sleep_score: Optional[int] = None # 1-100
    source: Optional[str] = None

    user: User = Relationship(back_populates="health_metrics")

# --- Endurance Module Models ---

class EnduranceGoal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True)
    target_event_kj: float = Field(default=0.0)
    hardest_section_power: float = Field(default=0.0)
    hardest_section_duration_min: float = Field(default=0.0)
    sprint_capability_sec: int = Field(default=15)
    recovery_demand: RecoveryDemand = Field(sa_column=Column(SQLEnum(RecoveryDemand)), default=RecoveryDemand.Average)
    ramp_rate: float = Field(default=1.02)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="endurance_goal")

class WeeklyPlanner(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    week_start_date: date_type
    ltw_kj: float = Field(default=0.0)
    stw_kj: float = Field(default=0.0)
    target_volume_kj: float = Field(default=0.0)
    z1_ceiling_power: float = Field(default=0.0)
    z3_target_power: float = Field(default=0.0)
    z3_budget_kj: float = Field(default=0.0)
    z4_ceiling_kj: float = Field(default=0.0)

    user: User = Relationship(back_populates="weekly_planners")

class PlannedWorkout(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    date: date_type
    planned_type: str
    planned_duration_min: int = Field(default=0)
    planned_kj: float = Field(default=0.0)
    notes: Optional[str] = None
    completed: bool = Field(default=False)

    user: User = Relationship(back_populates="planned_workouts")

class ZoneMetrics(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    activity_id: int = Field(foreign_key="activitylog.id", unique=True)
    z1_time_sec: int = Field(default=0)
    z1_avg_power: float = Field(default=0.0)
    z1_kj: float = Field(default=0.0)
    z2_time_sec: int = Field(default=0)
    z2_avg_power: float = Field(default=0.0)
    z2_kj: float = Field(default=0.0)
    z3_time_sec: int = Field(default=0)
    z3_avg_power: float = Field(default=0.0)
    z3_kj: float = Field(default=0.0)
    z4_time_sec: int = Field(default=0)
    z4_avg_power: float = Field(default=0.0)
    z4_kj: float = Field(default=0.0)
    total_kj: float = Field(default=0.0)

    activity: ActivityLog = Relationship(back_populates="zone_metrics")

class UserPhysiology(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True)
    lt1_power: float = Field(default=150.0)
    lt2_power: float = Field(default=200.0)
    max_sprint_duration_sec: int = Field(default=15)
    last_calibrated: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="physiology")

class DailySnapshot(SQLModel, table=True):
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    date: date_type = Field(primary_key=True)
    budget_kcal: float = Field(default=0.0)
    consumed_kcal: float = Field(default=0.0)
    burned_kcal: float = Field(default=0.0)
    net_kcal: float = Field(default=0.0)
    balance_kcal: float = Field(default=0.0)
    protein_g: float = Field(default=0.0)
    carbs_g: float = Field(default=0.0)
    fat_g: float = Field(default=0.0)
    fiber_g: float = Field(default=0.0)
    sodium_mg: float = Field(default=0.0)
    alcohol_g: float = Field(default=0.0)
    caffeine_mg: float = Field(default=0.0)
    hydration_ml: float = Field(default=0.0)
    iron_mg: float = Field(default=0.0)
    calcium_mg: float = Field(default=0.0)
    potassium_mg: float = Field(default=0.0)
    weight_kg: Optional[float] = Field(default=None)

# --- Fitness Signature Models ---

class FitnessSignature(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True)
    mpa_watts: float = Field(default=0.0)
    ftp_watts: float = Field(default=0.0)
    hie_kj: float = Field(default=0.0)
    last_mpa_date: Optional[datetime] = None
    last_ftp_date: Optional[datetime] = None
    last_hie_date: Optional[datetime] = None
    last_breakthrough_at: Optional[datetime] = None
    last_breakthrough_level: int = Field(default=0)
    decay_half_life_mpa: float = Field(default=14.0)
    decay_half_life_ftp: float = Field(default=30.0)
    decay_half_life_hie: float = Field(default=21.0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="fitness_signature")

class ActivityStress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    activity_id: int = Field(foreign_key="activitylog.id", unique=True)
    low_stress_kj: float = Field(default=0.0)
    high_stress_kj: float = Field(default=0.0)
    peak_stress_kj: float = Field(default=0.0)
    observed_mpa: float = Field(default=0.0)
    observed_ftp: float = Field(default=0.0)
    observed_hie: float = Field(default=0.0)
    breakthrough_level: int = Field(default=0)
    was_breakthrough: bool = Field(default=False)

    activity: ActivityLog = Relationship(back_populates="stress_metrics")

class DailyLoad(SQLModel, table=True):
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    date: date_type = Field(primary_key=True)
    daily_stress_kj: float = Field(default=0.0)
    low_stress_kj: float = Field(default=0.0)
    high_stress_kj: float = Field(default=0.0)
    peak_stress_kj: float = Field(default=0.0)
    ctl: float = Field(default=0.0)
    atl: float = Field(default=0.0)
    tsb: float = Field(default=0.0)

class FitnessGoal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    fitness_type: str
    overload_method: str = Field(default="intensity")
    validation_metric: str
    current_description: Optional[str] = None
    target_description: str
    metric_value: Optional[float] = None
    target_value: Optional[float] = None
    metric_unit: Optional[str] = None
    metric_type: str = Field(default="absolute")
    target_date: Optional[date_type] = None
    ramp_rate: int = Field(default=0)
    diet_approach: Optional[str] = None
    eating_window_start: Optional[str] = None
    eating_window_end: Optional[str] = None
    status: str = Field(default="active")
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="fitness_goals")
