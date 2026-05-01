import csv
import json
import io
from datetime import datetime
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.database import get_db
from app.auth import get_current_user
from app.models import (
    User, UserGoal, FoodLog, ActivityLog, HealthMetric,
    UserPhysiology, EnduranceGoal, WeeklyPlanner, ZoneMetrics, DailySnapshot
)
from app.budget import recalculate_daily_snapshot
from app.utils import get_user_today

router = APIRouter()


def _model_to_dict(obj) -> Dict[str, Any]:
    """Convert a SQLModel object to a JSON-serializable dict."""
    d = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        elif hasattr(val, 'isoformat'):  # date
            val = val.isoformat()
        elif hasattr(val, 'value'):  # Enum
            val = val.value
        d[col.name] = val
    return d


# ─────────────────────────────────────────────
#  EXPORT
# ─────────────────────────────────────────────

@router.get("/export/json")
async def export_json(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export all user data as a full JSON archive."""
    uid = current_user.id

    async def _all(model, filter_col="user_id"):
        stmt = select(model).where(getattr(model, filter_col) == uid)
        return (await db.execute(stmt)).scalars().all()

    # User profile (strip sensitive fields)
    user_dict = _model_to_dict(current_user)
    user_dict.pop("hashed_password", None)
    user_dict.pop("totp_secret", None)
    user_dict.pop("recovery_codes", None)

    goals = [_model_to_dict(r) for r in await _all(UserGoal)]
    food = [_model_to_dict(r) for r in await _all(FoodLog)]
    activity = [_model_to_dict(r) for r in await _all(ActivityLog)]
    health = [_model_to_dict(r) for r in await _all(HealthMetric)]
    physiology = [_model_to_dict(r) for r in await _all(UserPhysiology)]
    endurance_goal = [_model_to_dict(r) for r in await _all(EnduranceGoal)]
    weekly_planners = [_model_to_dict(r) for r in await _all(WeeklyPlanner)]

    # Zone metrics — join via activity IDs
    activity_ids = [a["id"] for a in activity]
    zone_metrics = []
    for aid in activity_ids:
        stmt = select(ZoneMetrics).where(ZoneMetrics.activity_id == aid)
        zm = (await db.execute(stmt)).scalars().first()
        if zm:
            zone_metrics.append(_model_to_dict(zm))

    payload = {
        "altus_export_version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "user": user_dict,
        "goals": goals,
        "food_logs": food,
        "activity_logs": activity,
        "zone_metrics": zone_metrics,
        "health_metrics": health,
        "physiology": physiology,
        "endurance_goals": endurance_goal,
        "weekly_planners": weekly_planners,
    }

    json_bytes = json.dumps(payload, indent=2, default=str).encode("utf-8")
    filename = f"altus_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/csv")
async def export_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export food logs, activity logs, and health metrics as a flat CSV."""
    uid = current_user.id

    output = io.StringIO()
    writer = csv.writer(output)

    # ── Food Logs ──
    writer.writerow(["--- NUTRITION JOURNAL ---"])
    writer.writerow([
        "date", "time", "meal_slot", "description",
        "kcal", "protein_g", "carbs_g", "fat_g", "fiber_g",
        "sodium_mg", "alcohol_g", "caffeine_mg", "hydration_ml",
        "iron_mg", "calcium_mg", "potassium_mg"
    ])
    stmt = select(FoodLog).where(FoodLog.user_id == uid).order_by(FoodLog.timestamp)
    foods = (await db.execute(stmt)).scalars().all()
    for f in foods:
        writer.writerow([
            f.timestamp.date(), f.timestamp.strftime("%H:%M"),
            f.meal_slot.value if hasattr(f.meal_slot, 'value') else f.meal_slot,
            f.description, f.kcal, f.protein_g, f.carbs_g, f.fat_g,
            f.fiber_g or "", f.sodium_mg or "", f.alcohol_g or "",
            f.caffeine_mg or "", f.hydration_ml or "",
            f.iron_mg or "", f.calcium_mg or "", f.potassium_mg or ""
        ])

    writer.writerow([])

    # ── Activity Logs ──
    writer.writerow(["--- ACTIVITY LOG ---"])
    writer.writerow(["date", "time", "type", "duration_min", "kcal_burned", "notes",
                     "total_kj", "z1_kj", "z2_kj", "z3_kj", "z4_kj"])
    stmt = select(ActivityLog).where(ActivityLog.user_id == uid).order_by(ActivityLog.timestamp)
    activities = (await db.execute(stmt)).scalars().all()
    for a in activities:
        zm_stmt = select(ZoneMetrics).where(ZoneMetrics.activity_id == a.id)
        zm = (await db.execute(zm_stmt)).scalars().first()
        writer.writerow([
            a.timestamp.date(), a.timestamp.strftime("%H:%M"),
            a.type, a.duration_min, a.kcal_burned, a.notes or "",
            zm.total_kj if zm else "", zm.z1_kj if zm else "",
            zm.z2_kj if zm else "", zm.z3_kj if zm else "", zm.z4_kj if zm else ""
        ])

    writer.writerow([])

    # ── Health / Biometrics ──
    writer.writerow(["--- BIOMETRICS ---"])
    writer.writerow(["date", "time", "weight_kg", "hrv", "rhr",
                     "sleep_hours", "sleep_quality", "sleep_score", "source"])
    stmt = select(HealthMetric).where(HealthMetric.user_id == uid).order_by(HealthMetric.timestamp)
    metrics = (await db.execute(stmt)).scalars().all()
    for m in metrics:
        writer.writerow([
            m.timestamp.date(), m.timestamp.strftime("%H:%M"),
            m.weight_kg or "", m.hrv or "", m.rhr or "",
            m.sleep_hours or "", m.sleep_quality or "",
            m.sleep_score or "", m.source or ""
        ])

    csv_bytes = output.getvalue().encode("utf-8")
    filename = f"altus_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ─────────────────────────────────────────────
#  IMPORT
# ─────────────────────────────────────────────

@router.post("/import")
async def import_data(
    file: UploadFile = File(...),
    mode: str = "merge",   # "merge" or "replace"
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Import data from a previously exported JSON archive.
    mode=merge: adds new records, skips duplicates by timestamp.
    mode=replace: deletes all user data first, then inserts from file.
    """
    if mode not in ("merge", "replace"):
        raise HTTPException(status_code=400, detail="mode must be 'merge' or 'replace'")

    MAX_IMPORT_BYTES = 50 * 1024 * 1024  # 50 MB
    content = await file.read(MAX_IMPORT_BYTES + 1)
    if len(content) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=413, detail="Import file too large. Maximum size is 50 MB.")
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file.")

    version = payload.get("altus_export_version")
    if not version:
        raise HTTPException(status_code=400, detail="Not a valid Altus export file.")

    uid = current_user.id

    # ── Replace mode: wipe existing data ──
    if mode == "replace":
        for food in (await db.execute(select(FoodLog).where(FoodLog.user_id == uid))).scalars().all():
            await db.delete(food)
        for act in (await db.execute(select(ActivityLog).where(ActivityLog.user_id == uid))).scalars().all():
            zm_stmt = select(ZoneMetrics).where(ZoneMetrics.activity_id == act.id)
            zm = (await db.execute(zm_stmt)).scalars().first()
            if zm:
                await db.delete(zm)
            await db.delete(act)
        for h in (await db.execute(select(HealthMetric).where(HealthMetric.user_id == uid))).scalars().all():
            await db.delete(h)
        for g in (await db.execute(select(UserGoal).where(UserGoal.user_id == uid))).scalars().all():
            await db.delete(g)
        for snap in (await db.execute(select(DailySnapshot).where(DailySnapshot.user_id == uid))).scalars().all():
            await db.delete(snap)
        await db.commit()

    # ── Helpers ──
    def _parse_dt(s):
        if not s:
            return datetime.utcnow()
        try:
            return datetime.fromisoformat(s)
        except Exception:
            return datetime.utcnow()

    stats = {"food": 0, "activity": 0, "health": 0, "goals": 0, "zone_metrics": 0}

    # Track existing timestamps for merge dedup
    existing_food_ts = set()
    existing_act_ts = set()
    existing_health_ts = set()

    if mode == "merge":
        foods_existing = (await db.execute(select(FoodLog).where(FoodLog.user_id == uid))).scalars().all()
        existing_food_ts = {f.timestamp.isoformat() for f in foods_existing}

        acts_existing = (await db.execute(select(ActivityLog).where(ActivityLog.user_id == uid))).scalars().all()
        existing_act_ts = {a.timestamp.isoformat() for a in acts_existing}

        health_existing = (await db.execute(select(HealthMetric).where(HealthMetric.user_id == uid))).scalars().all()
        existing_health_ts = {h.timestamp.isoformat() for h in health_existing}

    # ── Food Logs ──
    for row in payload.get("food_logs", []):
        ts = _parse_dt(row.get("timestamp"))
        if mode == "merge" and ts.isoformat() in existing_food_ts:
            continue
        db.add(FoodLog(
            user_id=uid,
            timestamp=ts,
            meal_slot=row.get("meal_slot"),
            description=row.get("description", ""),
            kcal=row.get("kcal", 0),
            protein_g=row.get("protein_g", 0),
            carbs_g=row.get("carbs_g", 0),
            fat_g=row.get("fat_g", 0),
            fiber_g=row.get("fiber_g"),
            sodium_mg=row.get("sodium_mg"),
            alcohol_g=row.get("alcohol_g"),
            caffeine_mg=row.get("caffeine_mg"),
            hydration_ml=row.get("hydration_ml"),
            iron_mg=row.get("iron_mg"),
            calcium_mg=row.get("calcium_mg"),
            potassium_mg=row.get("potassium_mg"),
        ))
        stats["food"] += 1

    # ── Activity Logs + Zone Metrics ──
    # Build old_id -> new_activity map for zone metrics
    old_id_map: Dict[int, ActivityLog] = {}
    for row in payload.get("activity_logs", []):
        ts = _parse_dt(row.get("timestamp"))
        if mode == "merge" and ts.isoformat() in existing_act_ts:
            continue
        act = ActivityLog(
            user_id=uid,
            timestamp=ts,
            type=row.get("type", ""),
            duration_min=row.get("duration_min", 0),
            kcal_burned=row.get("kcal_burned", 0),
            notes=row.get("notes"),
        )
        db.add(act)
        await db.flush()  # get act.id
        old_id_map[row.get("id")] = act
        stats["activity"] += 1

    for zm_row in payload.get("zone_metrics", []):
        old_act_id = zm_row.get("activity_id")
        new_act = old_id_map.get(old_act_id)
        if not new_act:
            continue
        db.add(ZoneMetrics(
            activity_id=new_act.id,
            z1_time_sec=zm_row.get("z1_time_sec", 0),
            z1_avg_power=zm_row.get("z1_avg_power", 0),
            z1_kj=zm_row.get("z1_kj", 0),
            z2_time_sec=zm_row.get("z2_time_sec", 0),
            z2_avg_power=zm_row.get("z2_avg_power", 0),
            z2_kj=zm_row.get("z2_kj", 0),
            z3_time_sec=zm_row.get("z3_time_sec", 0),
            z3_avg_power=zm_row.get("z3_avg_power", 0),
            z3_kj=zm_row.get("z3_kj", 0),
            z4_time_sec=zm_row.get("z4_time_sec", 0),
            z4_avg_power=zm_row.get("z4_avg_power", 0),
            z4_kj=zm_row.get("z4_kj", 0),
            total_kj=zm_row.get("total_kj", 0),
        ))
        stats["zone_metrics"] += 1

    # ── Health Metrics ──
    for row in payload.get("health_metrics", []):
        ts = _parse_dt(row.get("timestamp"))
        if mode == "merge" and ts.isoformat() in existing_health_ts:
            continue
        db.add(HealthMetric(
            user_id=uid,
            timestamp=ts,
            weight_kg=row.get("weight_kg"),
            hrv=row.get("hrv"),
            rhr=row.get("rhr"),
            sleep_hours=row.get("sleep_hours"),
            sleep_quality=row.get("sleep_quality"),
            sleep_score=row.get("sleep_score"),
            source=row.get("source"),
        ))
        stats["health"] += 1

    await db.commit()

    # ── Recalculate snapshots ──
    await recalculate_daily_snapshot(uid, get_user_today(current_user), db)

    return {
        "status": "success",
        "mode": mode,
        "imported": stats
    }
