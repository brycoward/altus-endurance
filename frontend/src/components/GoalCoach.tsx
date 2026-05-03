import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { useGoal, useEnduranceGoal, useUpdateGoal, useUpdateEnduranceGoal } from '../hooks/useAltus';
import { clsx } from 'clsx';
import { Bot, User, Target, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'coach';
  text: string;
}

export function GoalCoach() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'coach', text: "I'm Altus.Goals. Tell me about your aspirations — body composition, performance goals, target events, or timeline. I'll help you set clear, measurable objectives." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposedGoal, setProposedGoal] = useState<any>(null);
  const [proposedEnduranceGoal, setProposedEnduranceGoal] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: currentGoal } = useGoal();
  const { data: currentEnduranceGoal } = useEnduranceGoal();
  const updateGoal = useUpdateGoal();
  const updateEnduranceGoal = useUpdateEnduranceGoal();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, proposedGoal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text }]);
    setInput('');
    setProposedGoal(null);
    setProposedEnduranceGoal(null);
    setIsLoading(true);

    try {
      const resp = await api.goalsCoach({ message: text });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'coach', text: resp.reply }]);
      if (resp.goal_data) setProposedGoal(resp.goal_data);
      if (resp.endurance_goal_data) setProposedEnduranceGoal(resp.endurance_goal_data);
    } catch (err) {
      console.error('Goal coach error:', err);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'coach', text: 'Sorry, I ran into an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGoal = () => {
    if (!proposedGoal) return;
    const direction = proposedGoal.direction || 'maintain';
    const weeklyRate = proposedGoal.weekly_rate_kg || 0;
    updateGoal.mutate({
      direction,
      weekly_rate_kg: weeklyRate,
      target_weight_kg: proposedGoal.target_weight_kg,
      target_date: proposedGoal.target_date,
      body_fat_pct_target: proposedGoal.body_fat_pct_target,
      notes: proposedGoal.notes,
    });
  };

  const handleSaveEndurance = () => {
    if (!proposedEnduranceGoal) return;
    updateEnduranceGoal.mutate(proposedEnduranceGoal);
  };

  return (
    <div className="flex flex-col bg-[rgb(var(--bg-secondary))]">
      <div className="p-6 border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[rgb(var(--emerald))]/20 text-[rgb(var(--emerald))] border border-[rgb(var(--emerald))]/20 flex items-center justify-center">
            <Target size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">Goal Coach</h2>
            <p className="text-[10px] text-[rgb(var(--text-muted))] font-bold">Discuss and refine your goals</p>
          </div>
        </div>
        {currentGoal && currentGoal.target_weight_kg && (
          <div className="mt-3 p-3 bg-[rgb(var(--bg-primary))] border border-[rgb(var(--border))] rounded-xl text-xs text-[rgb(var(--text-secondary))]">
            Current goal: {currentGoal.direction} {Math.abs(currentGoal.weekly_rate_kg)} kg/wk
            {currentGoal.target_weight_kg && ` → ${currentGoal.target_weight_kg} kg target`}
            {currentGoal.target_date && ` by ${currentGoal.target_date}`}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="overflow-y-auto p-6 space-y-4 max-h-[400px]">
        {messages.map(m => (
          <div key={m.id} className={clsx("flex gap-3 max-w-[85%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
            <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", m.role === 'user' ? "bg-slate-800" : "bg-[rgb(var(--emerald))]/20 text-[rgb(var(--emerald))] border border-[rgb(var(--emerald))]/20")}>
              {m.role === 'user' ? <User size={16} /> : <Target size={16} />}
            </div>
            <div className={clsx("px-4 py-3 rounded-2xl text-sm leading-relaxed", m.role === 'user' ? "bg-blue-600 text-white" : "bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))]")}>
              {m.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-lg bg-[rgb(var(--emerald))]/20 text-[rgb(var(--emerald))] border border-[rgb(var(--emerald))]/20 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl text-sm bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))]">
              Thinking...
            </div>
          </div>
        )}

        {/* Proposed Goal Card */}
        {proposedGoal && (
          <div className="p-4 bg-[rgb(var(--bg-secondary))] border border-emerald-500/50 rounded-2xl space-y-3 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 text-emerald-400">
              <Check size={14} />
              <span className="text-xs font-black uppercase tracking-widest">Proposed Goal</span>
            </div>
            <div className="text-sm text-[rgb(var(--text-primary))] space-y-1">
              <p>Direction: <strong>{proposedGoal.direction}</strong> at <strong>{Math.abs(proposedGoal.weekly_rate_kg)} kg/wk</strong></p>
              {proposedGoal.target_weight_kg && <p>Target weight: <strong>{proposedGoal.target_weight_kg} kg</strong></p>}
              {proposedGoal.target_date && <p>Target date: <strong>{proposedGoal.target_date}</strong></p>}
              {proposedGoal.body_fat_pct_target && <p>Body fat target: <strong>{proposedGoal.body_fat_pct_target}%</strong></p>}
              {proposedGoal.notes && <p className="text-[rgb(var(--text-muted))] italic">{proposedGoal.notes}</p>}
            </div>
            <button
              onClick={handleSaveGoal}
              disabled={updateGoal.isLoading}
              className="w-full py-2.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {updateGoal.isLoading ? 'Saving...' : 'Save Goal'}
            </button>
          </div>
        )}

        {/* Proposed Endurance Goal Card */}
        {proposedEnduranceGoal && (
          <div className="p-4 bg-[rgb(var(--bg-secondary))] border border-indigo-500/50 rounded-2xl space-y-3 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 text-indigo-400">
              <Check size={14} />
              <span className="text-xs font-black uppercase tracking-widest">Proposed Performance Goal</span>
            </div>
            <div className="text-sm text-[rgb(var(--text-primary))] space-y-1">
              {proposedEnduranceGoal.target_event_kj && <p>Event target: <strong>{proposedEnduranceGoal.target_event_kj} kJ</strong></p>}
              {proposedEnduranceGoal.hardest_section_power && <p>Hardest section power: <strong>{proposedEnduranceGoal.hardest_section_power} W</strong></p>}
              {proposedEnduranceGoal.recovery_demand && <p>Recovery demand: <strong>{proposedEnduranceGoal.recovery_demand}</strong></p>}
            </div>
            <button
              onClick={handleSaveEndurance}
              disabled={updateEnduranceGoal.isLoading}
              className="w-full py-2.5 bg-indigo-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-400 transition-colors disabled:opacity-50"
            >
              {updateEnduranceGoal.isLoading ? 'Saving...' : 'Save Performance Goal'}
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 p-6 bg-gradient-to-t from-[rgb(var(--bg-secondary))] via-[rgb(var(--bg-secondary))] to-transparent">
        <form onSubmit={handleSubmit} className="relative group max-w-3xl mx-auto">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
          <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tell me about your goals..."
              className="flex-1 bg-transparent border-none focus:ring-0 px-5 py-4 text-slate-200 placeholder-slate-600 text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="pr-5 text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-30"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
