import math
from typing import List, Dict, Any, Tuple
import pandas as pd
from datetime import datetime, timedelta

def calculate_readiness(ltw: float, stw: float) -> str:
    """
    Traffic Light calculation based on LTW - STW ratio.
    If STW > LTW * 1.25 -> Red (Overreaching)
    If STW < LTW * 0.8 -> Yellow (Detraining)
    Else -> Green (Optimal)
    """
    if ltw == 0:
        return "Yellow" # No base

    ratio = stw / ltw
    if ratio > 1.25:
        return "Red"
    elif ratio < 0.8:
        return "Yellow"
    else:
        return "Green"

class EnduranceEngine:
    @staticmethod
    def calculate_rolling_averages(activities: List[Dict[str, Any]]) -> Tuple[float, float]:
        """
        Calculates LTW (42-day rolling average kJ/day) and STW (7-day rolling average kJ/day).
        Expects activities to be a list of dicts with 'date' and 'total_kj'.
        """
        if not activities:
            return 0.0, 0.0

        df = pd.DataFrame(activities)
        df['date'] = pd.to_datetime(df['date'])
        
        today = datetime.utcnow().date()
        date_42_days_ago = pd.to_datetime(today - timedelta(days=42))
        date_7_days_ago = pd.to_datetime(today - timedelta(days=7))

        ltw_mask = df['date'] >= date_42_days_ago
        stw_mask = df['date'] >= date_7_days_ago

        ltw_total = df.loc[ltw_mask, 'total_kj'].sum()
        stw_total = df.loc[stw_mask, 'total_kj'].sum()

        ltw = ltw_total / 42.0
        stw = stw_total / 7.0

        return float(ltw), float(stw)

    @staticmethod
    def auto_calibrate_lt2(df_1hz: pd.DataFrame) -> float:
        """
        Auto-calibrates LT2.
        Finds MMP60 and MMP20. If MMP60 is reliable, uses it.
        Otherwise estimates from MMP20 * 0.95.
        df_1hz must have 'power' column.
        """
        if len(df_1hz) < 1200: # 20 mins minimum
            return 0.0
            
        # Compute rolling averages
        mmp20 = df_1hz['power'].rolling(window=1200, min_periods=1200).mean().max()
        mmp60 = df_1hz['power'].rolling(window=3600, min_periods=3600).mean().max() if len(df_1hz) >= 3600 else 0.0

        if mmp60 > 0:
            return float(mmp60)
        return float(mmp20 * 0.95)

    @staticmethod
    def auto_calibrate_lt1(df_1hz: pd.DataFrame) -> float:
        """
        Auto-calibrates LT1 based on aerobic decoupling < 5% for > 45 mins.
        This is a simplified estimation. A rigorous one requires HR data and finding the inflection point.
        For now, we return a standard estimation of ~75% of LT2.
        """
        lt2 = EnduranceEngine.auto_calibrate_lt2(df_1hz)
        return float(lt2 * 0.75) if lt2 > 0 else 0.0
