import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { Activity, Upload, AlertCircle, Zap, Shield, BatteryCharging, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

export function EnduranceDashboard() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['endurance_dashboard'],
    queryFn: api.getEnduranceDashboard,
  });

  const uploadMutation = useMutation({
    mutationFn: api.uploadFitFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endurance_dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['snapshot'] });
      setIsUploading(false);
    },
    onError: (error) => {
      console.error("Upload failed", error);
      setIsUploading(false);
      alert("Failed to upload .fit file.");
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading Endurance Data...</div>;
  }

  const { ltw, stw, readiness, physiology, history } = dashboard || {};
  
  // Format history for charts
  const chartData = history ? [...history].reverse().map((h: any) => ({
    date: new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    total_kj: h.total_kj,
    z1_kj: h.z1_kj,
    z2_kj: h.z2_kj,
    z3_kj: h.z3_kj,
    z4_kj: h.z4_kj,
  })) : [];

  const readinessColor = 
    readiness === 'Green' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
    readiness === 'Yellow' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
    'text-red-500 bg-red-500/10 border-red-500/20';

  return (
    <div className="flex-1 overflow-y-auto bg-[rgb(var(--bg-primary))] p-8 space-y-8">
      {/* Header & Upload */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tighter">Endurance</h1>
          <p className="text-[rgb(var(--text-secondary))] font-medium">Auto-calibrating physics-based training engine.</p>
        </div>
        <div>
          <input 
            type="file" 
            accept=".fit" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-[rgb(var(--emerald))] text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Upload size={18} />
            {isUploading ? 'Parsing...' : 'Upload .FIT'}
          </button>
        </div>
      </div>

      {/* Readiness & Thresholds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness Traffic Light */}
        <div className={clsx("col-span-1 lg:col-span-2 border p-6 rounded-3xl flex items-center justify-between", readinessColor)}>
           <div>
             <div className="flex items-center gap-3 mb-2">
               <AlertCircle size={24} />
               <h2 className="text-xl font-black uppercase tracking-widest">Readiness: {readiness}</h2>
             </div>
             <p className="opacity-80 font-medium max-w-md">
               {readiness === 'Green' && "Your training load is balanced. Optimal state for productive workouts."}
               {readiness === 'Yellow' && "You are losing base fitness. Increase your Long Term Work (LTW)."}
               {readiness === 'Red' && "Overreaching detected. Short Term Work (STW) significantly exceeds base. Focus on recovery."}
             </p>
           </div>
           <div className="flex gap-8 text-right">
              <div>
                 <div className="text-[10px] font-black uppercase tracking-widest opacity-60">STW (7-Day)</div>
                 <div className="text-3xl font-black">{Math.round(stw || 0)} <span className="text-sm opacity-60">kJ/d</span></div>
              </div>
              <div>
                 <div className="text-[10px] font-black uppercase tracking-widest opacity-60">LTW (42-Day)</div>
                 <div className="text-3xl font-black">{Math.round(ltw || 0)} <span className="text-sm opacity-60">kJ/d</span></div>
              </div>
           </div>
        </div>

        {/* Physiology Anchor */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-6 rounded-3xl flex flex-col justify-center">
           <div className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-4">Auto-Calibrated Thresholds</div>
           <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-indigo-400"><BatteryCharging size={18}/> <span className="font-bold">LT1 (Base)</span></div>
              <div className="text-xl font-black text-[rgb(var(--text-primary))]">{Math.round(physiology?.lt1_power || 0)}W</div>
           </div>
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-rose-400"><Zap size={18}/> <span className="font-bold">LT2 (Threshold)</span></div>
              <div className="text-xl font-black text-[rgb(var(--text-primary))]">{Math.round(physiology?.lt2_power || 0)}W</div>
           </div>
        </div>
      </div>

      {/* KJ Output Growth Chart */}
      <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-6 rounded-3xl space-y-6 shadow-[var(--card-shadow)]">
         <div className="flex items-center justify-between">
           <h3 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Recent Activity KJ Output</h3>
         </div>
         <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: 'rgb(var(--text-primary))' }}
                />
                <Bar dataKey="z1_kj" stackId="a" fill="#818cf8" name="Zone 1 (Recovery)" />
                <Bar dataKey="z2_kj" stackId="a" fill="#10b981" name="Zone 2 (Endurance)" />
                <Bar dataKey="z3_kj" stackId="a" fill="#f59e0b" name="Zone 3 (Tempo/SS)" />
                <Bar dataKey="z4_kj" stackId="a" fill="#f43f5e" name="Zone 4 (Threshold+)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

    </div>
  );
}
