import math
import pandas as pd
from typing import Tuple, Dict, Optional
from datetime import datetime, timedelta

def apply_decay(peak_value: float, last_date: Optional[datetime], half_life_days: float, now: datetime) -> float:
    if not last_date or peak_value <= 0:
        return peak_value
    days_elapsed = (now - last_date).total_seconds() / 86400
    if days_elapsed <= 0:
        return peak_value
    lam = math.log(2) / half_life_days
    decayed = peak_value * math.exp(-lam * days_elapsed)
    return max(0.1, decayed)

def calculate_mpa(df_1hz: pd.DataFrame) -> float:
    if len(df_1hz) < 5:
        return 0.0
    rolling_5s = df_1hz['power'].rolling(window=5, min_periods=5).mean()
    return float(rolling_5s.max()) if not rolling_5s.empty else 0.0

def calculate_ftp_from_df(df_1hz: pd.DataFrame) -> float:
    if len(df_1hz) < 1200:
        return 0.0
    mmp20 = df_1hz['power'].rolling(window=1200, min_periods=1200).mean().max()
    mmp60 = df_1hz['power'].rolling(window=3600, min_periods=3600).mean().max() if len(df_1hz) >= 3600 else 0.0
    if mmp60 > 0:
        return float(mmp60)
    return float(mmp20 * 0.95)

def calculate_hie(df_1hz: pd.DataFrame, ftp: float) -> float:
    above_ftp = df_1hz['power'] - ftp
    above_ftp = above_ftp.clip(lower=0)
    return float(above_ftp.sum() / 1000.0)

def classify_stress(df_1hz: pd.DataFrame, ftp: float) -> Dict[str, float]:
    power = df_1hz['power'].clip(lower=0)
    low_mask = power <= ftp
    high_mask = (power > ftp) & (power <= (2 * ftp))
    peak_mask = power > (2 * ftp)
    low_kj = float(power[low_mask].sum() / 1000.0)
    high_raw = float(power[high_mask].sum() / 1000.0)
    high_time = int(high_mask.sum())
    ftp_contribution = ftp * high_time / 1000.0
    high_kj = max(0.0, high_raw - ftp_contribution)
    peak_kj = float(power[peak_mask].sum() / 1000.0)
    return {"low_stress_kj": round(low_kj + ftp_contribution, 2), "high_stress_kj": round(high_kj, 2), "peak_stress_kj": round(peak_kj, 2), "total_kj": round(low_kj + high_raw + peak_kj, 2)}

def detect_breakthrough(observed_mpa: float, observed_ftp: float, observed_hie: float, decayed_mpa: float, decayed_ftp: float, decayed_hie: float) -> Tuple[int, bool, float, float, float]:
    improved = 0
    new_mpa, new_ftp, new_hie = decayed_mpa, decayed_ftp, decayed_hie
    if observed_mpa > decayed_mpa:
        improved += 1
        new_mpa = observed_mpa
    if observed_ftp > decayed_ftp:
        improved += 1
        new_ftp = observed_ftp
    if observed_hie > decayed_hie:
        improved += 1
        new_hie = observed_hie
    return improved, improved > 0, new_mpa, new_ftp, new_hie

def recalc_daily_load(user_id, date, total_stress_kj, low_kj, high_kj, peak_kj, previous_ctl: float, previous_atl: float) -> Dict[str, float]:
    ctl = previous_ctl + (total_stress_kj - previous_ctl) / 42 if previous_ctl else total_stress_kj / 42
    atl = previous_atl + (total_stress_kj - previous_atl) / 7 if previous_atl else total_stress_kj / 7
    tsb = ctl - atl
    return {"ctl": round(ctl, 1), "atl": round(atl, 1), "tsb": round(tsb, 1)}
