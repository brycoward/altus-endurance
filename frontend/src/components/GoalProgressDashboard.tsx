import React from 'react';
import { useGoalProgress } from '../hooks/useAltus';
import { useUnits } from '../hooks/useUnits';
import { clsx } from 'clsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Target, Scale, Calendar, TrendingUp, Activity, Droplets, Flame, Zap, Loader2 } from 'lucide-react';

export function GoalProgressDashboard() {
  const { data: progress, isLoading } = useGoalProgress();
  const u = useUnits();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin opacity-50" />
      </div>
    );
  }

  if (!progress?.goal) {
    return (
      <div className="p-12 text-center">
        <Target size={48} className="mx-auto mb-4 text-slate-600" />
        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No Goals Set</h3>
        <p className="text-sm text-slate-600 mt-2">Use the Goal Coach below to set your first target.</p>
      </div>
    );
  }

  const goal = progress.goal;
  const latestWeight = progress.latest_weight_kg;
  const targetWeight = goal.target_weight_kg;
  const daysRemaining = progress.timeline?.days_remaining;
  const estimatedDate = progress.timeline?.estimated_completion_date;

  const chartData = (progress.weight_history || []).map((w: any) => ({
    date: new Date(w.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }),
    weight: w.weight_kg,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Goal Summary Header */}
      <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[rgb(var(--emerald))]/10 rounded-xl border border-[rgb(var(--emerald))]/20">
            <Target size={20} className="text-[rgb(var(--emerald))]" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">Goal Progress</h2>
            <p className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-widest">
              {goal.direction === 'lose' ? 'Weight Loss' : goal.direction === 'gain' ? 'Weight Gain' : 'Maintenance'}
              {goal.weekly_rate_kg !== 0 && ` • ${Math.abs(goal.weekly_rate_kg)} kg/wk`}
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricBox icon={Scale} label="Current" value={u.formatWeight(latestWeight || 0)} color="text-blue-400" />
          <MetricBox icon={Target} label="Target" value={u.formatWeight(targetWeight || 0)} color="text-[rgb(var(--emerald))]" />
          {daysRemaining !== null && daysRemaining !== undefined && (
            <MetricBox icon={Calendar} label="Days Left" value={`${daysRemaining}d`} color={daysRemaining < 30 ? 'text-amber-400' : 'text-indigo-400'} />
          )}
          {estimatedDate && (
            <MetricBox icon={TrendingUp} label="Est. Completion" value={new Date(estimatedDate + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })} color="text-slate-400" />
          )}
        </div>
      </div>

      {/* Weight Trend Chart */}
      {chartData.length > 1 && (
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))] mb-6">Weight Trend</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: 'rgb(var(--text-primary))' }}
                />
                {targetWeight && <ReferenceLine y={targetWeight} stroke="#10b981" strokeDasharray="8 4" label={{ value: `Target ${u.formatWeight(targetWeight)}`, fill: '#10b981', fontSize: 10, position: 'right' }} />}
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Adherence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Macro Adherence */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))] mb-4">Last 7 Days Average</h3>
          <div className="space-y-3">
            <AdherenceBar label="Protein" value={`${progress.adherence?.avg_protein_g || 0}g`} icon={Flame} color="bg-blue-500" />
            <AdherenceBar label="Carbs" value={`${progress.adherence?.avg_carbs_g || 0}g`} icon={Flame} color="bg-amber-500" />
            <AdherenceBar label="Fat" value={`${progress.adherence?.avg_fat_g || 0}g`} icon={Flame} color="bg-rose-500" />
            <AdherenceBar label="Hydration" value={`${Math.round(progress.adherence?.avg_hydration_ml || 0)} ml`} icon={Droplets} color="bg-cyan-500" />
          </div>
        </div>

        {/* Workout Adherence */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))] mb-4">Workout Adherence (This Week)</h3>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className={clsx(
                "text-6xl font-black",
                (progress.workout_adherence?.pct || 0) >= 80 ? 'text-[rgb(var(--emerald))]' :
                (progress.workout_adherence?.pct || 0) >= 50 ? 'text-amber-400' : 'text-red-400'
              )}>
                {progress.workout_adherence?.pct || 0}%
              </div>
              <div className="text-sm font-bold text-[rgb(var(--text-muted))] mt-2">
                {progress.workout_adherence?.completed || 0}/{progress.workout_adherence?.planned || 0} workouts
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-[9px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">{label}</span>
      </div>
      <div className={clsx("text-xl font-black", color)}>{value}</div>
    </div>
  );
}

function AdherenceBar({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="flex items-center justify-between bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3">
      <div className="flex items-center gap-2">
        <div className={clsx("w-2 h-2 rounded-full", color)} />
        <span className="text-xs font-bold text-[rgb(var(--text-secondary))]">{label}</span>
      </div>
      <span className="text-sm font-black text-[rgb(var(--text-primary))]">{value}</span>
    </div>
  );
}
