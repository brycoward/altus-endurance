import pytz
from datetime import datetime, date as date_type
from app.models import User

def get_user_now(user: User):
    try:
        tz = pytz.timezone(user.timezone or "UTC")
    except Exception:
        tz = pytz.UTC
    return datetime.now(tz)

def get_user_today(user: User):
    return get_user_now(user).date()

def get_user_local_date(dt: datetime, user: User):
    try:
        tz = pytz.timezone(user.timezone or "UTC")
    except Exception:
        tz = pytz.UTC
    
    # If naive, assume UTC
    if dt.tzinfo is None:
        dt = pytz.UTC.localize(dt)
    
    return dt.astimezone(tz).date()

def get_utc_range_for_date(target_date: date_type, timezone_str: str):
    try:
        tz = pytz.timezone(timezone_str or "UTC")
    except Exception:
        tz = pytz.UTC
        
    local_start = datetime.combine(target_date, datetime.min.time())
    local_end = datetime.combine(target_date, datetime.max.time())
    
    start_utc = tz.localize(local_start).astimezone(pytz.UTC).replace(tzinfo=None)
    end_utc = tz.localize(local_end).astimezone(pytz.UTC).replace(tzinfo=None)
    return start_utc, end_utc
