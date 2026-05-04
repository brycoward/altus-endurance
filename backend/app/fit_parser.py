import fitparse
import pandas as pd
from typing import Dict, Any

class FitParser:
    def __init__(self, file_path: str, lt1_power: float, lt2_power: float):
        self.file_path = file_path
        self.lt1 = lt1_power
        self.lt2 = lt2_power
        self.df = pd.DataFrame()

    def parse(self) -> Dict[str, Any]:
        fitfile = fitparse.FitFile(self.file_path)
        records = []
        for record in fitfile.get_messages('record'):
            data = {}
            for record_data in record:
                data[record_data.name] = record_data.value
            records.append(data)

        self.df = pd.DataFrame(records)
        
        # Ensure timestamp, power, heart_rate exist
        if 'power' not in self.df.columns:
            self.df['power'] = 0.0
        if 'heart_rate' not in self.df.columns:
            self.df['heart_rate'] = 0.0
            
        self.df['power'] = self.df['power'].fillna(0.0)
        self.df['heart_rate'] = self.df['heart_rate'].fillna(0.0)

        # Assuming 1Hz recording, dt = 1s.
        # Group by zones
        z1_mask = self.df['power'] < self.lt1
        z2_mask = (self.df['power'] >= self.lt1) & (self.df['power'] <= self.lt2)
        z3_mask = (self.df['power'] > self.lt2) & (self.df['power'] <= (2 * self.lt2))
        z4_mask = self.df['power'] > (2 * self.lt2)

        metrics = {
            "z1_time_sec": int(z1_mask.sum()),
            "z1_kj": float(self.df.loc[z1_mask, 'power'].sum() / 1000.0),
            "z1_avg_power": float(self.df.loc[z1_mask, 'power'].mean()) if z1_mask.sum() > 0 else 0.0,
            
            "z2_time_sec": int(z2_mask.sum()),
            "z2_kj": float(self.df.loc[z2_mask, 'power'].sum() / 1000.0),
            "z2_avg_power": float(self.df.loc[z2_mask, 'power'].mean()) if z2_mask.sum() > 0 else 0.0,
            
            "z3_time_sec": int(z3_mask.sum()),
            "z3_kj": float(self.df.loc[z3_mask, 'power'].sum() / 1000.0),
            "z3_avg_power": float(self.df.loc[z3_mask, 'power'].mean()) if z3_mask.sum() > 0 else 0.0,
            
            "z4_time_sec": int(z4_mask.sum()),
            "z4_kj": float(self.df.loc[z4_mask, 'power'].sum() / 1000.0),
            "z4_avg_power": float(self.df.loc[z4_mask, 'power'].mean()) if z4_mask.sum() > 0 else 0.0,
        }
        
        metrics["total_kj"] = metrics["z1_kj"] + metrics["z2_kj"] + metrics["z3_kj"] + metrics["z4_kj"]
        metrics["total_duration_min"] = len(self.df) // 60
        metrics["max_instantaneous_power"] = float(self.df['power'].max()) if len(self.df) > 0 else 0.0
        
        return metrics
