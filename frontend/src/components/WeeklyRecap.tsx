import React from 'react';
import { useLatestDigest } from '../hooks/useAltus';
import { clsx } from 'clsx';
import {
  Calendar, Clock, Flame, TrendingUp, TrendingDown, Activity,
  Target, AlertCircle, Loader2, CheckCircle, XCircle, Utensils, Brain
} from 'lucide-react';

export function WeeklyRecap() {
  const { data, isLoading } = useLatestDigest();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin opacity-50" />
      </div>
    );
  }

  if (!data?.exists) {
    return (
      <div className="flex-1 bg-[rgb(var(--bg-primary))] p-12">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <Calendar size={64} className="mx-auto text-slate-600" />
          <h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest">No Recap Yet</h2>
          <p className="text-slate-500 font-medium">{data?.message || 'Digests are generated every 4 hours. Check back later for your weekly summary.'}</p>
        </div>
      </div>
    );
  }

  const d = data.digest;
  const p = d.last_7_days;
  const today = d.today;
  const health = d.health_trends;
  const notes = d.patterns?.notes || [];
  const generated = new Date(d.generated_at + 'Z').toLocaleString();

  const adherenceColor = p.adherence_pct >= 80 ? 'text-emerald-400' : p.adherence_pct >= 50 ? 'text-amber-400' : 'text-red-400';
  const adherenceBg = p.adherence_pct >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : p.adherence_pct >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

  return (
    <div className="flex-1 bg-[rgb(var(--bg-primary))] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter text-[rgb(var(--text-primary))]">Weekly Recap</h1>
                <p className="text-xs font-bold text-[rgb(var(--text-muted))]">{d.user_profile.age}y · {d.user_profile.sex} · {d.user_profile.height_cm}cm</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Clock size={12} className="text-[rgb(var(--text-muted))]" />
              <span className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase">
                Generated {generated}
                {data.is_stale && <span className="text-amber-400 ml-2">(stale — digest may be outdated)</span>}
              </span>
            </div>
          </div>
          <div className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl border text-lg font-black", adherenceBg, adherenceColor)}>
            {p.adherence_pct >= 80 ? <CheckCircle size={20} /> : p.adherence_pct >= 50 ? <AlertCircle size={20} /> : <XCircle size={20} />}
            {Math.round(p.adherence_pct)}%
            <span className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Adherence</span>
          </div>
        </div>

        {/* Goal Context */}
        {d.user_profile.goal && (
          <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">Goal Context</h3>
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-widest">Direction</div>
                <div className="text-lg font-black text-[rgb(var(--text-primary))] capitalize">{d.user_profile.goal.direction}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-widest">Weekly Rate</div>
                <div className="text-lg font-black text-[rgb(var(--text-primary))]">{Math.abs(d.user_profile.goal.weekly_rate_kg)} kg/wk</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-widest">Target Calories</div>
                <div className="text-lg font-black text-[rgb(var(--text-primary))]}">{Math.round(d.user_profile.goal.target_kcal)} kcal</div>
              </div>
            </div>
          </div>
        )}

        {/* 7-Day Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard icon={Flame} label="Avg Consumed" value={`${Math.round(p.avg_kcal_consumed)} kcal`} color="text-blue-400" />
          <SummaryCard icon={Activity} label="Avg Burned" value={`${Math.round(p.avg_kcal_burned)} kcal`} color="text-rose-400" />
          <SummaryCard icon={TrendingUp} label="Avg Balance" value={`${Math.round(p.avg_balance)} kcal`} color={p.avg_balance < 0 ? 'text-emerald-400' : 'text-amber-400'} />
        </div>

        {/* Macro Averages */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))] mb-4">7-Day Macro Averages</h3>
          <div className="grid grid-cols-3 gap-6">
            <MacroBar label="Protein" value={Math.round(p.macro_averages.protein_g)} unit="g" color="bg-blue-500" pct={Math.min(p.macro_averages.protein_g / 200 * 100, 100)} />
            <MacroBar label="Carbs" value={Math.round(p.macro_averages.carbs_g)} unit="g" color="bg-amber-500" pct={Math.min(p.macro_averages.carbs_g / 300 * 100, 100)} />
            <MacroBar label="Fat" value={Math.round(p.macro_averages.fat_g)} unit="g" color="bg-rose-500" pct={Math.min(p.macro_averages.fat_g / 100 * 100, 100)} />
          </div>
        </div>

        {/* Best / Worst Day */}
        {p.best_day && p.worst_day && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 shadow-lg">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <CheckCircle size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Best Day</span>
              </div>
              <div className="text-lg font-black text-[rgb(var(--text-primary))]">{new Date(p.best_day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
              <div className="text-sm text-emerald-400 font-bold">Closest to target balance</div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 shadow-lg">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Worst Day</span>
              </div>
              <div className="text-lg font-black text-[rgb(var(--text-primary))]">{new Date(p.worst_day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
              <div className="text-sm text-red-400 font-bold">Furthest from target balance</div>
            </div>
          </div>
        )}

        {/* Coach Observations */}
        {notes.length > 0 && (
          <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={16} className="text-purple-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">Coach Observations</h3>
            </div>
            <ul className="space-y-3">
              {notes.map((note: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                  <span className="text-sm text-[rgb(var(--text-secondary))]">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Today's Entries Preview */}
        {today.entries && today.entries.length > 0 && (
          <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Utensils size={16} className="text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">Latest Day: {new Date(today.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
            </div>
            <div className="space-y-2">
              {today.entries.map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] min-w-[80px]">{e.slot}</span>
                    <span className="text-sm font-bold text-[rgb(var(--text-primary))]">{e.description}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-xs font-black text-blue-400">{Math.round(e.kcal)} kcal</span>
                    <span className="text-xs font-black text-emerald-400">{Math.round(e.protein_g)}g P</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[rgb(var(--border))] flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">Daily Total</span>
              <span className={clsx('text-lg font-black', today.balance_kcal < 0 ? 'text-emerald-400' : 'text-amber-400')}>
                {Math.round(today.consumed_kcal)} / {Math.round(today.consumed_kcal - today.balance_kcal)} kcal
              </span>
            </div>
          </div>
        )}

        {/* Health Trends */}
        {(health.latest_weight_kg || health.avg_hrv_7d) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {health.latest_weight_kg && (
              <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
                <div className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">Latest Weight</div>
                <div className="text-3xl font-black text-[rgb(var(--text-primary))]">{health.latest_weight_kg} <span className="text-sm opacity-50 font-bold">kg</span></div>
              </div>
            )}
            {health.avg_hrv_7d && (
              <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
                <div className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">7-Day Avg HRV</div>
                <div className="text-3xl font-black text-[rgb(var(--text-primary))]">{Math.round(health.avg_hrv_7d)} <span className="text-sm opacity-50 font-bold">ms</span></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={color} />
        <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">{label}</span>
      </div>
      <div className={clsx('text-2xl font-black', color)}>{value}</div>
    </div>
  );
}

function MacroBar({ label, value, unit, color, pct }: { label: string; value: number; unit: string; color: string; pct: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-[rgb(var(--text-secondary))]">{label}</span>
        <span className="text-[rgb(var(--text-primary))]">{value}<span className="opacity-50 ml-0.5">{unit}</span></span>
      </div>
      <div className="h-2 bg-[rgb(var(--bg-primary))] rounded-full overflow-hidden border border-[rgb(var(--border))]">
        <div className={clsx('h-full rounded-full transition-all duration-1000', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
