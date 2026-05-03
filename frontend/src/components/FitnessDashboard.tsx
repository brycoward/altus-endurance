import React, { useState, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  useFitnessSignature, useFitnessChronic, useFitnessStress, useEnduranceGoal
} from '../hooks/useAltus';
import { clsx } from 'clsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Legend, ComposedChart
} from 'recharts';
import {
  Zap, BatteryCharging, Activity, TrendingUp, Upload, Award, Loader2,
  Flame, ChevronDown, ChevronUp
} from 'lucide-react';

const MEDAL_ICONS: Record<number, string> = { 1: '🥉', 2: '🥈', 3: '🥇' };
const MEDAL_LABELS: Record<number, string> = { 1: 'Bronze', 2: 'Silver', 3: 'Gold' };

export function FitnessDashboard() {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: signature, isLoading: sigLoading } = useFitnessSignature();
  const { data: chronic } = useFitnessChronic(90);
  const { data: stress } = useFitnessStress(30);

  const uploadMutation = useMutation({
    mutationFn: api.uploadFitFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fitnessSignature'] });
      queryClient.invalidateQueries({ queryKey: ['fitnessChronic'] });
      queryClient.invalidateQueries({ queryKey: ['fitnessStress'] });
      queryClient.invalidateQueries({ queryKey: ['endurance_dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['snapshot'] });
      setIsUploading(false);
    },
    onError: () => { setIsUploading(false); alert('Upload failed.'); }
  });

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setIsUploading(true); uploadMutation.mutate(file); }
  };

  const ctlAtsData = useMemo(() => chronic?.map((d: any) => ({
    date: new Date(d.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }),
    ctl: d.ctl, atl: d.atl, tsb: d.tsb, daily: d.daily_stress_kj,
  })) || [], [chronic]);

  const stressData = useMemo(() => (stress || []).slice(0, 20).reverse().map((s: any) => ({
    date: new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    low: Math.round(s.low_stress_kj), high: Math.round(s.high_stress_kj),
    peak: Math.round(s.peak_stress_kj),
    breakthrough: s.breakthrough_level,
  })), [stress]);

  const breakthroughs = useMemo(() => (stress || []).filter((s: any) => s.was_breakthrough).reverse(), [stress]);

  const formatPower = (w: number) => `${Math.round(w)}W`;
  const formatEnergy = (kj: number) => `${Math.round(kj)}kJ`;
  const pctOfPeak = (decayed: number, peak: number) => peak > 0 ? Math.round(decayed / peak * 100) : 100;

  if (sigLoading) {
    return <div className="flex-1 flex items-center justify-center p-12"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin opacity-50" /></div>;
  }

  return (
    <div className="flex-1 bg-[rgb(var(--bg-primary))] overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
        {/* Header + Upload */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-[rgb(var(--text-primary))]">Fitness Signature</h1>
              <p className="text-xs font-bold text-[rgb(var(--text-muted))]">Critical power model with decay tracking</p>
            </div>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept=".fit" className="hidden" onChange={handleUpload} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-2 bg-[rgb(var(--emerald))] text-black px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-opacity disabled:opacity-50">
              <Upload size={16} />{isUploading ? 'Parsing...' : 'Upload .FIT'}
            </button>
          </div>
        </div>

        {/* Signature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SignatureCard
            icon={Zap} label="Maximum Power Available" unit="W"
            peak={signature?.peak?.mpa || 0} decayed={signature?.decayed?.mpa || 0}
            color="text-red-400" bg="bg-red-500/10" border="border-red-500/20"
            pct={pctOfPeak(signature?.decayed?.mpa || 0, signature?.peak?.mpa || 0)}
          />
          <SignatureCard
            icon={BatteryCharging} label="Functional Threshold Power" unit="W"
            peak={signature?.peak?.ftp || 0} decayed={signature?.decayed?.ftp || 0}
            color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20"
            pct={pctOfPeak(signature?.decayed?.ftp || 0, signature?.peak?.ftp || 0)}
          />
          <SignatureCard
            icon={Flame} label="High Intensity Energy" unit="kJ"
            peak={signature?.peak?.hie || 0} decayed={signature?.decayed?.hie || 0}
            color="text-orange-400" bg="bg-orange-500/10" border="border-orange-500/20"
            pct={pctOfPeak(signature?.decayed?.hie || 0, signature?.peak?.hie || 0)}
          />
        </div>

        {/* CTL/ATL/TSB Chart */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-cyan-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">CTL / ATL / TSB (90-Day)</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={ctlAtsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} yAxisId="left" />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} yAxisId="right" orientation="right" />
                <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }} labelStyle={{ color: 'rgb(var(--text-primary))', fontSize: 12, fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="ctl" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="CTL (Fitness)" yAxisId="left" />
                <Line type="monotone" dataKey="atl" stroke="#f43f5e" strokeWidth={2} dot={false} name="ATL (Fatigue)" yAxisId="left" />
                <Bar dataKey="daily" fill="#6366f1" opacity={0.12} name="Daily kJ" yAxisId="right" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TSB (Form) Chart */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={16} className="text-purple-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Form (TSB = CTL - ATL)</h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ctlAtsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} />
                <ReferenceLine y={0} stroke="rgba(var(--border), 0.6)" strokeWidth={1} />
                <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }} labelStyle={{ color: 'rgb(var(--text-primary))', fontSize: 12, fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="tsb" stroke="#a78bfa" strokeWidth={2.5} dot={false} name="TSB (Form)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stress Breakdown */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
          <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))] mb-6">Recent Activity Stress Breakdown</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }} labelStyle={{ color: 'rgb(var(--text-primary))', fontSize: 12, fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                <Bar dataKey="low" stackId="a" fill="#10b981" name="Low Stress" />
                <Bar dataKey="high" stackId="a" fill="#f59e0b" name="High Stress" />
                <Bar dataKey="peak" stackId="a" fill="#f43f5e" name="Peak Stress" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakthroughs */}
        {breakthroughs.length > 0 && (
          <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] rounded-3xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <Award size={18} className="text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Breakthrough History</h3>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {breakthroughs.map((b: any) => (
                <div key={b.activity_id} className="flex items-center justify-between bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{MEDAL_ICONS[b.breakthrough_level] || ''}</span>
                    <div>
                      <div className="text-sm font-bold text-[rgb(var(--text-primary))]">
                        {MEDAL_LABELS[b.breakthrough_level]} Breakthrough
                      </div>
                      <div className="text-[10px] font-bold text-[rgb(var(--text-muted))]">
                        {new Date(b.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' '}· {b.type || 'Ride'} · {b.duration_min}m
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] font-bold text-[rgb(var(--text-secondary))]">
                    {b.observed_mpa > 0 && <span>MPA: {Math.round(b.observed_mpa)}W</span>}
                    {b.observed_ftp > 0 && <span>FTP: {Math.round(b.observed_ftp)}W</span>}
                    {b.observed_hie > 0 && <span>HIE: {Math.round(b.observed_hie)}kJ</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SignatureCard({ icon: Icon, label, unit, peak, decayed, color, bg, border, pct }: any) {
  return (
    <div className={clsx("rounded-3xl p-6 shadow-lg border", bg, border)}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className={color} />
        <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className={clsx("text-3xl font-black", color)}>{Math.round(decayed)}{unit}</span>
        <span className="text-sm font-bold text-[rgb(var(--text-muted))] opacity-60">current</span>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-bold text-[rgb(var(--text-muted))]">Peak: {Math.round(peak)}{unit}</span>
        <span className={clsx("text-[10px] font-black uppercase", pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-red-400')}>{pct}% retained</span>
      </div>
      <div className="h-2 bg-[rgb(var(--bg-primary))] rounded-full overflow-hidden border border-[rgb(var(--border))]">
        <div className={clsx('h-full rounded-full transition-all duration-1000', color.replace('text-', 'bg-'))} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
