import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useCalendarWeek, useWeekPlan, useSaveWeekPlan, useGenerateWeekPlan } from '../hooks/useAltus';
import { JournalFeed } from './JournalFeed';
import { clsx } from 'clsx';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Activity, Flame,
  Sparkles, Loader2, Upload, Eye, EyeOff, Clock, Utensils, Scale, Bike,
  Dumbbell, Waves, Footprints, Mountain, PersonStanding, Zap, LucideIcon
} from 'lucide-react';

const typeIcons: Record<string, LucideIcon> = {
  Ride: Bike, Run: Footprints, Swim: Waves,
  Strength: Dumbbell, Hike: Mountain, Walk: PersonStanding,
  Yoga: PersonStanding, Rest: Zap, Other: Activity,
};
const typeColors: Record<string, string> = {
  Ride: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  Run: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Swim: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Strength: 'text-red-400 bg-red-500/10 border-red-500/20',
  Hike: 'text-green-400 bg-green-500/10 border-green-500/20',
  Walk: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  Yoga: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Rest: 'text-slate-500 bg-slate-800 border-slate-700',
  Other: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = start.toLocaleDateString('en-US', opts);
  const e = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${s} – ${e}`;
}

export function CalendarDashboard() {
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPlanned, setShowPlanned] = useState(true);
  const [detailTab, setDetailTab] = useState<'nutrition' | 'training' | 'biometrics'>('nutrition');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const dateStr = monday.toISOString().split('T')[0];
  const { data: calendar, isLoading } = useCalendarWeek(dateStr);
  const { data: weekPlan } = useWeekPlan(dateStr);
  const savePlan = useSaveWeekPlan();
  const generatePlan = useGenerateWeekPlan();

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const navigateWeek = (dir: number) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + dir * 7);
    setMonday(d);
    setSelectedDate(null);
  };

  const goToday = () => {
    setMonday(getMonday(new Date()));
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleAutoPlan = () => {
    generatePlan.mutate(dateStr, {
      onSuccess: (data) => {
        if (data.workouts && data.workouts.length > 0) {
          savePlan.mutate({ week_start_date: dateStr, workouts: data.workouts });
        }
      }
    });
  };

  const handleFitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await api.uploadFitFile(file);
        window.location.reload();
      } catch (err) {
        console.error('Upload failed', err);
      }
    }
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex-1 bg-[rgb(var(--bg-primary))] flex flex-col h-full overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 p-4 md:p-6 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigateWeek(-1)} className="p-2 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
              <ChevronLeft size={18} />
            </button>
            <CalendarIcon size={16} className="text-[rgb(var(--emerald))] hidden sm:block" />
            <span className="text-sm font-black text-[rgb(var(--text-primary))] uppercase tracking-tighter hidden sm:inline">
              {formatDateRange(monday, sunday)}
            </span>
            <span className="text-sm font-black text-[rgb(var(--text-primary))] uppercase tracking-tighter sm:hidden">
              {monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={() => navigateWeek(1)} className="p-2 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
              <ChevronRight size={18} />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 bg-[rgb(var(--emerald))] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity">
              Today
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Planned toggle */}
            <button
              onClick={() => setShowPlanned(!showPlanned)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors",
                showPlanned
                  ? "bg-[rgb(var(--emerald))]/10 text-[rgb(var(--emerald))] border-[rgb(var(--emerald))]/20"
                  : "bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))]"
              )}
            >
              {showPlanned ? <Eye size={14} /> : <EyeOff size={14} />}
              Planned
            </button>

            {/* Auto-plan */}
            <button
              onClick={handleAutoPlan}
              disabled={generatePlan.isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
            >
              {generatePlan.isLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Auto-Plan
            </button>

            {/* FIT Upload */}
            <input ref={fileInputRef} type="file" accept=".fit" className="hidden" onChange={handleFitUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl text-xs font-black uppercase tracking-widest text-[rgb(var(--text-muted))] hover:text-[rgb(var(--emerald))] transition-colors"
            >
              <Upload size={14} />
              .FIT
            </button>
          </div>
        </div>

        {/* Readiness Bar */}
        {calendar?.readiness && (
          <div className={clsx(
            "mt-4 px-4 py-2 rounded-xl flex items-center gap-3 text-xs font-bold",
            calendar.readiness.status === 'Green' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            calendar.readiness.status === 'Yellow' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          )}>
            <div className={clsx(
              "w-2 h-2 rounded-full",
              calendar.readiness.status === 'Green' ? 'bg-emerald-400' :
              calendar.readiness.status === 'Yellow' ? 'bg-amber-400' : 'bg-red-400'
            )} />
            <span className="uppercase tracking-widest">{calendar.readiness.status}</span>
            <span className="opacity-70">LTW {calendar.readiness.ltw} kJ/d</span>
            <span className="opacity-70">STW {calendar.readiness.stw} kJ/d</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[rgb(var(--emerald))] animate-spin opacity-50" />
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && calendar && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 border-b border-[rgb(var(--border))] divide-x divide-[rgb(var(--border))] min-h-[180px]">
            {calendar.days.map((day: any, i: number) => {
              const isToday = day.is_today;
              const isSelected = day.date === selectedDate;
              const adherenceColor = day.adherence_pct >= 85 ? 'bg-emerald-500' :
                                    day.adherence_pct >= 60 ? 'bg-amber-500' : 'bg-red-500';

              return (
                <div
                  key={day.date}
                  onClick={() => {
                    setSelectedDate(isSelected ? null : day.date);
                    if (!isSelected) setDetailTab('nutrition');
                  }}
                  className={clsx(
                    "p-2 md:p-3 cursor-pointer transition-all group relative",
                    isToday && "bg-[rgb(var(--emerald))]/5",
                    isSelected && "ring-2 ring-[rgb(var(--emerald))] ring-inset",
                    !isSelected && "hover:bg-[rgb(var(--bg-secondary))]"
                  )}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={clsx(
                      "text-[10px] font-black uppercase tracking-widest",
                      isToday ? "text-[rgb(var(--emerald))]" : "text-[rgb(var(--text-muted))]"
                    )}>
                      {dayLabels[i]}
                    </span>
                    <span className={clsx(
                      "text-lg font-black",
                      isToday ? "text-[rgb(var(--text-primary))]" : "text-[rgb(var(--text-secondary))]"
                    )}>
                      {new Date(day.date + 'T12:00:00').getDate()}
                    </span>
                  </div>

                  {/* Adherence dot */}
                  <div className="flex items-center gap-1 mb-2">
                    <div className={clsx("w-1.5 h-1.5 rounded-full", adherenceColor)} />
                    <span className="text-[9px] font-bold text-[rgb(var(--text-muted))]">{day.adherence_pct}%</span>
                  </div>

                  {/* Planned workouts (toggle) */}
                  {showPlanned && day.planned_workouts?.map((pw: any, j: number) => {
                    const Icon = typeIcons[pw.planned_type] || Activity;
                    return (
                      <div key={j} className="mb-1 px-1.5 py-0.5 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded text-[8px] font-bold flex items-center gap-1 opacity-70 text-[rgb(var(--text-muted))]">
                        <Icon size={10} className="text-[rgb(var(--emerald))]/50" />
                        {pw.planned_type} {pw.planned_duration_min}m
                      </div>
                    );
                  })}

                  {/* Actual activities */}
                  {day.activities?.map((a: any, j: number) => {
                    const Icon = typeIcons[a.type] || Activity;
                    const colorClass = typeColors[a.type] || typeColors.Other;
                    return (
                      <div key={j} className={clsx("mb-1 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-1 border", colorClass)}>
                        <Icon size={10} />
                        {a.type} {a.duration_min}m
                        <span className="opacity-60 ml-auto">{Math.round(a.total_kj)}kJ</span>
                      </div>
                    );
                  })}

                  {/* Calories */}
                  <div className="mt-2 text-[9px] font-bold text-[rgb(var(--text-muted))]">
                    <span className={clsx(
                      day.snapshot.balance_kcal < 0 ? "text-[rgb(var(--emerald))]" : "text-[rgb(var(--text-muted))]"
                    )}>
                      {Math.round(day.snapshot.consumed_kcal)}/{Math.round(day.snapshot.budget_kcal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day Detail Panel */}
          {selectedDate && (
            <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))]">
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <div className="flex gap-1 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl p-1">
                  {(['nutrition', 'training', 'biometrics'] as const).map(tab => {
                    const Icon = tab === 'nutrition' ? Utensils : tab === 'training' ? Activity : Scale;
                    return (
                      <button
                        key={tab}
                        onClick={() => setDetailTab(tab)}
                        className={clsx(
                          "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                          detailTab === tab
                            ? (tab === 'nutrition' ? 'bg-emerald-500/20 text-emerald-400' :
                               tab === 'training' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400')
                            : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'
                        )}
                      >
                        <Icon size={12} />
                        {tab}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                <JournalFeed
                  dateStr={selectedDate}
                  viewMode={detailTab === 'nutrition' ? 'journal' :
                           detailTab === 'training' ? 'journal' : 'biometrics'}
                  initialTab={detailTab === 'biometrics' ? 'health' : undefined}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
