import React from 'react';
import { useSnapshot, useHistory, useUser, useLatestHealth } from '../hooks/useAltus';
import { useUnits } from '../hooks/useUnits';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Scale, Activity, Flame, TrendingUp, Heart, Zap } from 'lucide-react';
import { clsx } from 'clsx';

export function Dashboard() {
  const { data: snapshot } = useSnapshot();
  const { data: history } = useHistory();
  const { data: user } = useUser();
  const { data: latestHealth } = useLatestHealth();
  const u = useUnits();

  const chartData = React.useMemo(() => {
    if (!history) return [];
    
    // Get current BMR estimate
    const age = user ? new Date().getFullYear() - (user.birth_year || 1990) : 30;
    const latestWeight = latestHealth?.weight_kg || 75;
    const calculatedBmr = user?.sex === 'M' 
      ? (10 * latestWeight) + (6.25 * (user?.height_cm || 180)) - (5 * age) + 5
      : (10 * latestWeight) + (6.25 * (user?.height_cm || 180)) - (5 * age) - 161;
    
    const bmrBase = user?.bmr_override || calculatedBmr;

    return history.slice().reverse().map((d: any) => ({
      date: new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      weight: d.weight_kg || latestWeight,
      consumed: d.consumed_kcal,
      burned: d.burned_kcal + bmrBase,
      net: d.net_kcal
    }));
  }, [history, user, latestHealth]);

  const balance = snapshot?.balance_kcal ?? 0;

  return (
    <div className="flex-1 overflow-y-auto bg-[rgb(var(--bg-primary))] p-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tighter">Performance Dashboard</h1>
          <p className="text-[rgb(var(--text-secondary))] font-medium">Welcome back, {user?.name || 'Athlete'}. Here is your current status.</p>
        </div>
        <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">Daily Balance</div>
            <div className={clsx(
                "text-4xl font-black",
                balance < 0 ? "text-red-500" : "text-[rgb(var(--emerald))]"
            )}>
                {Math.round(balance)} <span className="text-xl opacity-50">kcal</span>
            </div>
        </div>
      </div>

      {/* Grid of Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <StatCard 
            label="Daily Consumed" 
            value={snapshot?.consumed_kcal || 0} 
            unit="kcal" 
            icon={Flame} 
            color="text-blue-400" 
            bg="bg-blue-500/10"
        />
        <StatCard 
            label="Daily Burned" 
            value={snapshot?.burned_kcal || 0} 
            unit="kcal" 
            icon={Activity} 
            color="text-rose-400" 
            bg="bg-rose-500/10"
        />
        <StatCard 
            label="Protein" 
            value={snapshot?.protein_g || 0} 
            unit="g" 
            icon={TrendingUp} 
            color="text-emerald-400" 
            bg="bg-emerald-500/10"
        />
        <StatCard 
            label="Weight" 
            value={u.formatWeight(latestHealth?.weight_kg || 0)} 
            unit="" 
            icon={Scale} 
            color="text-amber-400" 
            bg="bg-amber-500/10"
        />
        <StatCard 
            label="RHR" 
            value={latestHealth?.rhr || 0} 
            unit="bpm" 
            icon={Heart} 
            color="text-rose-500" 
            bg="bg-rose-500/10"
        />
        <StatCard 
            label="HRV" 
            value={latestHealth?.hrv || 0} 
            unit="ms" 
            icon={Zap} 
            color="text-indigo-400" 
            bg="bg-indigo-500/10"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weight Trend */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-6 rounded-3xl space-y-6 shadow-[var(--card-shadow)]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Weight Trend</h3>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-amber-500 rounded-full" />
                 <span className="text-[10px] font-bold text-[rgb(var(--text-muted))] uppercase">Weight (kg)</span>
               </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: 'rgb(var(--text-primary))' }}
                />
                <Area type="monotone" dataKey="weight" stroke="#f59e0b" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Burned vs Consumed Bar Chart */}
        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-6 rounded-3xl space-y-6 shadow-[var(--card-shadow)]">
          <h3 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-secondary))]">Expended vs Consumed</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border), 0.5)" vertical={false} />
                <XAxis dataKey="date" stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgb(var(--text-muted))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                   contentStyle={{ backgroundColor: 'rgb(var(--bg-secondary))', border: '1px solid rgb(var(--border))', borderRadius: '12px' }}
                   itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: 'rgb(var(--text-primary))' }}
                />
                <Bar dataKey="consumed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="burned" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-6 rounded-3xl space-y-4 shadow-[var(--card-shadow)]">
      <div className={clsx("p-3 rounded-2xl w-fit", bg)}>
        <Icon className={color} size={24} />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">{label}</div>
        <div className="text-2xl font-black text-[rgb(var(--text-primary))] tracking-tight">
          {Math.round(value)} <span className="text-sm opacity-40 font-bold ml-1">{unit}</span>
        </div>
      </div>
    </div>
  );
}
