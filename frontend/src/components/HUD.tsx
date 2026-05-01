import React, { useState, useEffect } from 'react';
import { useSnapshot, useGoal, useUpdateGoal } from '../hooks/useAltus';
import { clsx } from 'clsx';
import { Activity, Flame, Utensils, Target, Settings, Clock as ClockIcon, MessageSquare, Book, Calendar, Scale } from 'lucide-react';
import { ProfileModal } from './ProfileModal';

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center md:items-end">
      <div className="text-2xl font-mono font-bold text-slate-100 tracking-tighter">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}

export function HUD({ activeView, onViewChange }: { activeView: string, onViewChange: (v: any) => void }) {
  const { data: snapshot } = useSnapshot();
  const { data: goal } = useGoal();
  const updateGoal = useUpdateGoal();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const balance = snapshot?.balance_kcal ?? 0;
  const isNegative = balance < 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const direction = val < 0 ? 'lose' : val > 0 ? 'gain' : 'maintain';
    updateGoal.mutate({ direction, weekly_rate_kg: val });
  };
  return (
    <>
    <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 md:p-6 shadow-2xl">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Logo & Balance */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => onViewChange('chat')}
              className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
            >
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                <Target size={20} className="text-emerald-400" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-black text-slate-200 tracking-tighter uppercase leading-none">Altus</div>
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Command</div>
              </div>
            </button>
            
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            <div className="text-center md:text-left">
              <div className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Daily Balance</div>
              <div className={clsx(
                "text-4xl md:text-6xl font-black tabular-nums transition-colors duration-500",
                isNegative ? "text-red-500" : "text-emerald-400"
              )}>
                {Math.round(balance)}
                <span className="text-xl md:text-2xl ml-2 opacity-50 font-normal">kcal</span>
              </div>
            </div>
            
            <div className="h-12 w-px bg-slate-800 hidden md:block" />
            
            <div className="hidden md:block">
              <Clock />
            </div>
          </div>

          {/* Center: Macro Pills - Hidden on small mobile to save space */}
          <div className="hidden sm:flex flex-wrap gap-3 justify-center">
            <MacroPill label="Protein" value={snapshot?.protein_g ?? 0} unit="g" color="bg-blue-500" />
            <MacroPill label="Carbs" value={snapshot?.carbs_g ?? 0} unit="g" color="bg-amber-500" />
            <MacroPill label="Fat" value={snapshot?.fat_g ?? 0} unit="g" color="bg-rose-500" />
          </div>

          {/* Right: Goal & Settings */}
          <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
            <div className="w-full md:w-64">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-tighter">
                <span>Lose</span>
                <span className="text-slate-300">Goal: {goal?.weekly_rate_kg ?? 0} kg/wk</span>
                <span>Gain</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.25"
                value={goal?.weekly_rate_kg ?? 0}
                onChange={handleSliderChange}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="mt-2 text-[9px] text-center text-slate-600 font-medium">
                Computed Modifier: {Math.round((goal?.weekly_rate_kg ?? 0) * 1100)} kcal/day
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => onViewChange('biometrics')}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border",
                  activeView === 'biometrics' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50" : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50"
                )}
              >
                <Scale className="w-3 h-3" />
                Biometrics
              </button>
              <button 
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border border-slate-700/50"
              >
                <Settings className="w-3 h-3" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View Selector */}
        <div className="flex md:hidden items-center justify-between bg-slate-950/50 rounded-xl p-1 border border-slate-800">
          <button 
            onClick={() => onViewChange('journal')}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all",
              activeView === 'journal' ? "bg-slate-800 text-emerald-400 shadow-lg" : "text-slate-500"
            )}
          >
            <Book className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold uppercase">Journal</span>
          </button>
          <button 
            onClick={() => onViewChange('biometrics')}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all",
              activeView === 'biometrics' ? "bg-slate-800 text-indigo-400 shadow-lg" : "text-slate-500"
            )}
          >
            <Scale className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold uppercase">Bio</span>
          </button>
          <button 
            onClick={() => onViewChange('chat')}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all",
              activeView === 'chat' ? "bg-slate-800 text-emerald-400 shadow-lg" : "text-slate-500"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold uppercase">Chat</span>
          </button>
          <button 
            onClick={() => onViewChange('history')}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all",
              activeView === 'history' ? "bg-slate-800 text-emerald-400 shadow-lg" : "text-slate-500"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold uppercase">History</span>
          </button>
        </div>

      </div>
    </div>
    
    <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}

function MacroPill({ label, value, unit, color }: { label: string, value: number, unit: string, color: string }) {
  return (
    <div className="flex flex-col items-center bg-slate-800/50 border border-slate-700/50 px-4 py-2 rounded-xl min-w-[80px]">
      <span className="text-[10px] text-slate-500 uppercase font-bold">{label}</span>
      <span className="text-lg font-bold text-slate-200">
        {Math.round(value)}<span className="text-xs ml-0.5 opacity-40 font-normal">{unit}</span>
      </span>
      <div className={clsx("w-full h-1 mt-1 rounded-full", color)} />
    </div>
  );
}
