import React, { useState, useMemo } from 'react';
import { useHistory, useUser } from '../hooks/useAltus';
import { clsx } from 'clsx';
import { Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Minus, X } from 'lucide-react';
import { JournalFeed } from './JournalFeed';

export function HistoryCalendar() {
  const { data: history, error: historyError } = useHistory();
  const { data: user, error: userError } = useUser();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Memoized daily data calculation to avoid side effects in render
  const { dailyData, weeklyNet } = useMemo(() => {
    // Get current BMR estimate
    const age = user ? new Date().getFullYear() - (user.birth_year || 1990) : 30;
    const latestWeight = 75; // Fallback
    const calculatedBmr = user?.sex === 'M' 
      ? (10 * latestWeight) + (6.25 * (user?.height_cm || 180)) - (5 * age) + 5
      : (10 * latestWeight) + (6.25 * (user?.height_cm || 180)) - (5 * age) - 161;
    
    const bmrBase = user?.bmr_override || calculatedBmr;

    // Last 7 days
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const historyMap = history?.reduce((acc: any, snap: any) => {
      acc[snap.date] = snap;
      return acc;
    }, {}) || {};

    let totalNet = 0;
    const data = days.map(date => {
      const snap = historyMap[date];
      const hasLogs = snap && (snap.consumed_kcal > 0 || snap.burned_kcal > 0);
      
      const cin = hasLogs ? snap.consumed_kcal : 0;
      const cout = hasLogs ? (bmrBase + snap.burned_kcal) : 0;
      const net = cin - cout;
      
      totalNet += net;
      
      // Parse date parts manually for robustness
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      return {
        date,
        cin,
        cout,
        net,
        hasLogs,
        dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        displayDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    });

    return { dailyData: data, weeklyNet: totalNet };
  }, [history, user]);

  const todayStr = new Date().toISOString().split('T')[0];

  if (historyError || userError) {
    return <div className="p-8 text-red-500 text-sm font-bold text-center">Error loading history</div>;
  }

  if (!user || !history) {
     return (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
     );
  }

  return (
    <div className="flex-1 bg-[rgb(var(--bg-primary))] flex flex-col h-full overflow-hidden">
      
      {/* Weekly Summary Hero */}
      <div className="p-8 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <CalendarIcon size={14} className="text-[rgb(var(--emerald))]" />
          <h3 className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">7-Day Performance History</h3>
        </div>
        
        <div className="flex flex-col items-center justify-center py-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-2">Weekly Net Balance</div>
          <div className={clsx(
            "text-6xl font-black flex items-center gap-3",
            weeklyNet > 0 ? "text-red-400" : "text-[rgb(var(--emerald))]"
          )}>
            {weeklyNet > 0 ? <ArrowUpRight size={40} /> : <ArrowDownRight size={40} />}
            {Math.abs(Math.round(weeklyNet))}
            <span className="text-xl opacity-50 font-bold">kcal</span>
          </div>
          <p className="text-[rgb(var(--text-muted))] text-xs mt-4 max-w-xs text-center font-medium leading-relaxed">
            Your total net balance over the last 7 days. {weeklyNet > 0 ? 'You are in a surplus.' : 'You are in a deficit.'}
          </p>
        </div>
      </div>

      {/* Daily Breakdown List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-[rgb(var(--border))]">
          {dailyData.map((day) => {
            const isToday = day.date === todayStr;

            return (
              <div 
                key={day.date} 
                className={clsx(
                  "p-6 transition-all hover:bg-[rgb(var(--bg-secondary))] cursor-pointer group", 
                  isToday && "bg-[rgba(var(--emerald),0.03)]"
                )}
                onClick={() => setSelectedDate(day.date)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <div className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-tighter">
                        {isToday ? "Today" : day.dayName}
                      </div>
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--emerald))] animate-pulse" />}
                    </div>
                    <div className="text-sm font-black text-[rgb(var(--text-primary))]">{day.displayDate}</div>
                  </div>
                  <div className="text-right">
                    <div className={clsx(
                      "flex items-center gap-1 text-base font-black",
                      day.net > 0 ? "text-red-400" : day.net < 0 ? "text-[rgb(var(--emerald))]" : "text-[rgb(var(--text-muted))]"
                    )}>
                      {day.net > 0 ? <ArrowUpRight size={16} /> : day.net < 0 ? <ArrowDownRight size={16} /> : <Minus size={16} />}
                      {Math.abs(Math.round(day.net))}
                    </div>
                    <div className="text-[8px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest">Net Kcal</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">
                      <span>Consumed</span>
                      <span className="text-[rgb(var(--text-secondary))]">{Math.round(day.cin)}</span>
                    </div>
                    <div className="h-1.5 bg-[rgb(var(--bg-primary))] rounded-full overflow-hidden border border-[rgb(var(--border))]">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                        style={{ width: `${Math.min((day.cin / 3000) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))]">
                      <span>Expended</span>
                      <span className="text-[rgb(var(--text-secondary))]">{Math.round(day.cout)}</span>
                    </div>
                    <div className="h-1.5 bg-[rgb(var(--bg-primary))] rounded-full overflow-hidden border border-[rgb(var(--border))]">
                      <div 
                        className="h-full bg-rose-500 transition-all duration-1000 shadow-[0_0_8px_rgba(244,63,94,0.5)]" 
                        style={{ width: `${Math.min((day.cout / 3000) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="absolute inset-0 z-50 bg-[rgb(var(--bg-primary))] flex flex-col animate-in slide-in-from-right-8 duration-300">
          <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))]">
            <div>
               <h3 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--emerald))]">
                Daily Detail
              </h3>
              <p className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-widest mt-1">
                 {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button 
              onClick={() => setSelectedDate(null)} 
              className="p-3 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-all shadow-sm"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <JournalFeed dateStr={selectedDate} />
          </div>
        </div>
      )}
    </div>
  );
}
