import React, { useMemo, useState } from 'react';
import { useAnalysisDashboard } from '../hooks/useAltus';
import { useUnits } from '../hooks/useUnits';
import { clsx } from 'clsx';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ReferenceLine, Legend, ComposedChart
} from 'recharts';
import {
  Activity, TrendingUp, Scale, Heart, Zap, Moon, Loader2,
  ChevronDown, ChevronUp
} from 'lucide-react';

export function DataAnalysis() {
  const { data, isLoading } = useAnalysisDashboard(90);
  const u = useUnits();
  const [showProjection, setShowProjection] = useState(true);
  const [timeRange, setTimeRange] = useState(90);

  const chartData = useMemo(() => {
    if (!data?.days) return [];
    const sliced = data.days.slice(-timeRange);
    return sliced.map((d: any) => {
      const date = new Date(d.date + 'T12:00:00');
      return {
        date: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        fullDate: date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
        // Training
        ltw: d.training?.ltw || 0,
        stw: d.training?.stw || 0,
        kj: d.training?.total_kj || 0,
        // Nutrition
        consumed: d.nutrition?.consumed_kcal || 0,
        burned: d.nutrition?.burned_kcal || 0,
        balance: d.nutrition?.balance_kcal || 0,
        protein: d.nutrition?.protein_g || 0,
        carbs: d.nutrition?.carbs_g || 0,
        fat: d.nutrition?.fat_g || 0,
        // Health
        weight: d.health?.weight_kg || null,
        hrv: d.health?.hrv || null,
        rhr: d.health?.rhr || null,
        sleep: d.health?.sleep_hours || null,
      };
    });
  }, [data, timeRange]);

  const readinessZones = useMemo(() => {
    return chartData
      .filter((d: any) => d.ltw > 0 && d.stw > 0)
      .map((d: any) => {
        const ratio = d.ltw > 0 ? d.stw / d.ltw : 1;
        const zone = ratio > 1.25 ? 'overreach' : ratio < 0.8 ? 'detrain' : 'optimal';
        return { ...d, zone };
      });
  }, [chartData]);

  const projections = data?.weight_projection;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-[rgb(var(--emerald))] animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[rgb(var(--bg-primary))] overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-[rgb(var(--text-primary))]">Data Analysis</h1>
              <p className="text-xs font-bold text-[rgb(var(--text-muted))]">Multi-week trends, projections, and correlations</p>
            </div>
          </div>
          <div className="flex gap-1 bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-xl p-1">
            {[30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setTimeRange(d)}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                  timeRange === d ? "bg-[rgb(var(--emerald))] text-slate-950" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
                )}
              >{d}d</button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryStat icon={Activity} label="Avg Daily kJ" value={`${Math.round(chartData.reduce((s: number, d: any) => s + d.kj, 0) / Math.max(chartData.filter((d: any) => d.kj > 0).length, 1))} kJ`} color="text-orange-400" />
          <SummaryStat icon={TrendingUp} label="Avg Balance" value={`${Math.round(chartData.reduce((s: number, d: any) => s + d.balance, 0) / Math.max(chartData.filter((d: any) => d.balance !== 0).length, 1))} kcal`} color="text-cyan-400" />
          <SummaryStat icon={Scale} label="Latest Weight" value={u.formatWeight(chartData.filter((d: any) => d.weight).slice(-1)[0]?.weight || 0)} color="text-blue-400" />
          <SummaryStat icon={Heart} label="Avg RHR" value={`${Math.round(chartData.filter((d: any) => d.rhr).reduce((s: number, d: any) => s + d.rhr, 0) / Math.max(chartData.filter((d: any) => d.rhr > 0).length, 1))} bpm`} color="text-rose-400" />
        </div>

        {/* Performance Management Chart - LTW/STW */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={16} className="text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Performance Management — LTW / STW</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'kJ / day', angle: -90, position: 'insideLeft', style: { fill: 'rgb(var(--text-muted))', fontSize: 10 } }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }}
                  labelStyle={{ color: 'rgb(var(--text-primary))', fontSize: 12, fontWeight: 'bold' }}
                  itemStyle={{ fontSize: 11, padding: '2px 0' }}
                />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="ltw" stroke="#10b981" strokeWidth={2.5} dot={false} name="LTW (42d avg)" />
                <Line type="monotone" dataKey="stw" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="STW (7d avg)" />
                <Bar dataKey="kj" fill="#6366f1" opacity={0.15} name="Daily kJ" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nutrition vs Training */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={16} className="text-cyan-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Calorie Balance</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }}
                    labelStyle={{ color: 'rgb(var(--text-primary))', fontSize: 12, fontWeight: 'bold' }}
                    itemStyle={{ fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Bar dataKey="consumed" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Consumed" />
                  <Bar dataKey="burned" fill="#f43f5e" radius={[2, 2, 0, 0]} name="Burned" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Macro Stack */}
          <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={16} className="text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Macro Distribution</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }}
                    labelStyle={{ color: 'rgb(var(--text-primary))', fontSize: 12, fontWeight: 'bold' }}
                    itemStyle={{ fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Bar dataKey="protein" stackId="a" fill="#3b82f6" name="Protein" />
                  <Bar dataKey="carbs" stackId="a" fill="#f59e0b" name="Carbs" />
                  <Bar dataKey="fat" stackId="a" fill="#f43f5e" name="Fat" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Weight Trend + Projection */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Weight Trend</h3>
            </div>
            {projections && (
              <button
                onClick={() => setShowProjection(!showProjection)}
                className={clsx(
                  "flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                  showProjection ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))]"
                )}
              >
                {showProjection ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Projection
              </button>
            )}
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} label={{ value: u.label.weight, angle: -90, position: 'insideLeft', style: { fill: 'rgb(var(--text-muted))', fontSize: 10 } }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }}
                  labelStyle={{ color: 'rgb(var(--text-primary))', fontSize: 12, fontWeight: 'bold' }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.08} name="Weight" dot={false} connectNulls />
                {showProjection && projections?.projections?.length > 0 && (
                  <Line data={projections.projections.map((p: any) => ({ date: new Date(p.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }), weight: p.weight_kg }))} type="monotone" dataKey="weight" stroke="rgba(16, 185, 129, 0.6)" strokeWidth={2} strokeDasharray="6 4" name="Projected" dot={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {projections && (
            <div className="mt-4 p-4 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-2xl">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">Trend</div>
                  <div className={clsx("text-sm font-black", projections.trend_slope_kg_per_day < 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {projections.trend_slope_kg_per_day > 0 ? '+' : ''}{(projections.trend_slope_kg_per_day * 7).toFixed(2)} kg/wk
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">Projected 4wk</div>
                  <div className="text-sm font-black text-[rgb(var(--text-primary))]">{u.formatWeight(projections.projections?.[3]?.weight_kg || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">Projected 8wk</div>
                  <div className="text-sm font-black text-[rgb(var(--text-primary))]">{u.formatWeight(projections.projections?.[7]?.weight_kg || 0)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Health Metrics - RHR, HRV, Sleep */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <Heart size={16} className="text-rose-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Recovery Metrics</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} yAxisId="left" />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} yAxisId="right" orientation="right" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }}
                  labelStyle={{ color: 'rgb(var(--text-primary))', fontSize: 12, fontWeight: 'bold' }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="rhr" stroke="#f43f5e" strokeWidth={2} dot={false} name="RHR (bpm)" yAxisId="left" connectNulls />
                <Line type="monotone" dataKey="hrv" stroke="#a78bfa" strokeWidth={2} dot={false} name="HRV (ms)" yAxisId="right" connectNulls />
                <Line type="monotone" dataKey="sleep" stroke="#38bdf8" strokeWidth={2} dot={false} name="Sleep (h)" yAxisId="right" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-2xl p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-[9px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">{label}</span>
      </div>
      <div className={clsx("text-lg font-black", color)}>{value}</div>
    </div>
  );
}
