import React, { useState, useEffect } from 'react';
import { useUser, useUpdateUser, useGoal, useUpdateGoal, useFitnessGoals, useCreateFitnessGoal, useUpdateFitnessGoal, useDeleteFitnessGoal } from '../hooks/useAltus';
import { api } from '../api/client';
import { User as UserIcon, Globe, Calendar, Ruler, Shield, Lock, Plus, Edit2, Trash2, Target, Dumbbell, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { COMMON_TIMEZONES } from '../utils/timezone-data';

export function UserSettings() {
  const { data: user } = useUser();
  const updateUser = useUpdateUser();
  const [activeTab, setActiveTab] = useState<'user' | 'bmr' | 'goals' | 'security'>('user');
  const [formData, setFormData] = useState({
    name: '',
    birth_year: 1990,
    height_cm: 180,
    sex: 'M',
    timezone: 'UTC',
    telegram_username: '',
    bmr_override: 0,
    activity_multiplier: 1.2,
    unit_system: 'metric'
  });

  const [tfaData, setTfaData] = useState<{ secret: string, qr_code: string } | null>(null);
  const [tfaToken, setTfaToken] = useState('');
  const [tfaError, setTfaError] = useState('');
  const [tfaSuccess, setTfaSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        birth_year: user.birth_year || 1990,
        height_cm: user.height_cm || 180,
        sex: user.sex || 'M',
        timezone: user.timezone || 'UTC',
        telegram_username: user.telegram_username || '',
        bmr_override: user.bmr_override || 0,
        activity_multiplier: user.activity_multiplier || 1.2,
        unit_system: user.unit_system || 'metric',
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, bmr_override: formData.bmr_override === 0 ? null : formData.bmr_override };
    updateUser.mutate(payload);
  };

  const handleTfaSetup = async () => {
    try {
      const res = await api.setup2fa();
      setTfaData(res);
    } catch (err) {
      setTfaError('Failed to initiate 2FA setup.');
    }
  };

  const handleTfaVerify = async () => {
    setTfaError('');
    try {
      await api.verify2fa(tfaToken);
      setTfaSuccess(true);
      setTfaData(null);
    } catch (err) {
      setTfaError('Invalid token. Please try again.');
    }
  };

  const age = new Date().getFullYear() - formData.birth_year;
  const latestWeight = 75; 
  const calculatedBmr = formData.sex === 'M' 
    ? (10 * latestWeight) + (6.25 * formData.height_cm) - (5 * age) + 5
    : (10 * latestWeight) + (6.25 * formData.height_cm) - (5 * age) - 161;
    
  const calculatedTdee = formData.bmr_override > 0 
    ? formData.bmr_override 
    : calculatedBmr * formData.activity_multiplier;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">User Settings</h1>
          <p className="text-slate-500 font-medium">Manage your personal information and performance defaults.</p>
        </div>

        <div className="flex border-b border-slate-800 shrink-0">
          <button 
            onClick={() => setActiveTab('user')}
            className={clsx(
              "px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
              activeTab === 'user' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Profile
          </button>
          <button 
            onClick={() => setActiveTab('bmr')}
            className={clsx(
              "px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
              activeTab === 'bmr' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Metabolism
          </button>
          <button 
            onClick={() => setActiveTab('goals')}
            className={clsx(
              "px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
              activeTab === 'goals' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Goals
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={clsx(
              "px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
              activeTab === 'security' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Security
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {activeTab === 'user' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-2 duration-200">
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <UserIcon className="w-3 h-3" /> Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Birth Year
                </label>
                <input
                  type="number"
                  value={formData.birth_year}
                  onChange={(e) => setFormData({ ...formData, birth_year: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Ruler className="w-3 h-3" /> Height (cm)
                </label>
                <input
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Sex</label>
                <select
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {COMMON_TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 col-span-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Units</label>
                <div className="flex bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, unit_system: 'metric' })}
                    className={clsx(
                      "flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all",
                      formData.unit_system === 'metric'
                        ? "bg-emerald-500 text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Metric
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, unit_system: 'imperial' })}
                    className={clsx(
                      "flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all",
                      formData.unit_system === 'imperial'
                        ? "bg-emerald-500 text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Imperial
                  </button>
                </div>
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Telegram Username</label>
                <input
                  type="text"
                  placeholder="@username (optional)"
                  value={formData.telegram_username}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.startsWith('@')) val = val.substring(1);
                    setFormData({ ...formData, telegram_username: val });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100"
                />
              </div>

            </div>
          )}

          {activeTab === 'bmr' && (
            <div className="space-y-6 animate-in slide-in-from-right-2 duration-200">
               <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 text-center">
                  <div className="text-sm font-black uppercase tracking-widest text-slate-500">Base Metabolic Rate (BMR)</div>
                  <div className="text-6xl font-black text-slate-300">
                    {Math.round(calculatedBmr)} <span className="text-2xl opacity-50 font-normal">kcal/day</span>
                  </div>
                  <p className="text-slate-500 max-w-sm mx-auto text-xs">This is your base daily energy expenditure at rest.</p>
               </div>

               <div className={clsx(
                  "bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 transition-opacity",
                  formData.bmr_override > 0 && "opacity-50"
               )}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Activity Level</label>
                      {formData.bmr_override > 0 && (
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Disabled by manual override</span>
                      )}
                    </div>
                    <select
                      value={formData.activity_multiplier}
                      onChange={(e) => setFormData({ ...formData, activity_multiplier: parseFloat(e.target.value) })}
                      disabled={formData.bmr_override > 0}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors disabled:cursor-not-allowed"
                    >
                      <option value={1.2}>Sedentary (Little or no exercise)</option>
                      <option value={1.375}>Lightly Active (Light exercise 1-3 days/week)</option>
                      <option value={1.55}>Moderately Active (Moderate exercise 3-5 days/week)</option>
                      <option value={1.725}>Very Active (Hard exercise 6-7 days/week)</option>
                      <option value={1.9}>Extra Active (Very hard exercise & physical job)</option>
                    </select>
                  </div>
               </div>

               <div className="bg-slate-900 border border-emerald-500/20 p-8 rounded-3xl space-y-6 text-center shadow-[0_0_40px_-15px_rgba(16,185,129,0.2)]">
                  <div className="text-sm font-black uppercase tracking-widest text-emerald-500">Total Daily Energy Expenditure (TDEE)</div>
                  <div className="text-6xl font-black text-emerald-400">
                    {Math.round(calculatedTdee)} <span className="text-2xl opacity-50 font-normal">kcal/day</span>
                  </div>
                  <p className="text-slate-500 max-w-sm mx-auto text-xs">This is your estimated maintenance calories based on your BMR and activity level.</p>
               </div>

               <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-300 uppercase tracking-widest">Manual Energy Override (TDEE)</label>
                    <div 
                      onClick={() => setFormData({ ...formData, bmr_override: formData.bmr_override ? 0 : Math.round(calculatedTdee) })}
                      className={clsx(
                        "w-12 h-6 rounded-full relative cursor-pointer transition-colors",
                        formData.bmr_override ? "bg-emerald-500" : "bg-slate-700"
                      )}
                    >
                      <div className={clsx(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        formData.bmr_override ? "right-1" : "left-1"
                      )} />
                    </div>
                  </div>

                  {formData.bmr_override > 0 && (
                    <input
                      type="number"
                      value={formData.bmr_override}
                      onChange={(e) => setFormData({ ...formData, bmr_override: parseFloat(e.target.value) })}
                      className="w-full bg-slate-950 border border-emerald-500/50 rounded-2xl px-4 py-4 text-slate-100 text-center font-black text-3xl"
                    />
                  )}
               </div>
            </div>
          )}

            {activeTab === 'goals' && <GoalsTab />}

           {activeTab === 'security' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-200">
               <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                        user?.is_totp_enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-500"
                    )}>
                        <Shield size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">Two-Factor Authentication</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                            {user?.is_totp_enabled ? "Enabled" : "Disabled"}
                        </p>
                    </div>
                  </div>

                  {!user?.is_totp_enabled && !tfaData && (
                    <button 
                        type="button"
                        onClick={handleTfaSetup}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-4 rounded-2xl transition-all"
                    >
                        Setup 2FA
                    </button>
                  )}

                  {tfaData && (
                    <div className="space-y-6 pt-6 border-t border-slate-800 animate-in fade-in zoom-in duration-300 text-center">
                        <div className="flex justify-center p-4 bg-white rounded-3xl mx-auto w-fit shadow-2xl">
                            <img src={`data:image/png;base64,${tfaData.qr_code}`} alt="QR Code" className="w-48 h-48" />
                        </div>
                        <code className="block text-emerald-400 text-sm font-mono bg-slate-950 px-4 py-2 rounded-xl">Secret: {tfaData.secret}</code>
                        <div className="space-y-4 max-w-xs mx-auto">
                            <input 
                                type="text" 
                                maxLength={6}
                                value={tfaToken}
                                onChange={(e) => setTfaToken(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-center text-3xl font-black text-white tracking-[0.5em]"
                                placeholder="000000"
                            />
                            {tfaError && <p className="text-red-400 text-xs font-bold">{tfaError}</p>}
                            <button 
                                type="button"
                                onClick={handleTfaVerify}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20"
                            >
                                Verify & Enable
                            </button>
                        </div>
                    </div>
                  )}

                  {tfaSuccess && (
                     <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-4 px-6 rounded-2xl text-center font-bold">
                        2FA Enabled successfully!
                     </div>
                  )}
               </div>
               
               <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <Lock size={20} className="text-slate-500" />
                      <span className="text-sm font-black text-slate-300 uppercase tracking-widest">Recovery Codes</span>
                  </div>
                  <button type="button" className="text-xs font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors">
                      View codes
                  </button>
               </div>
            </div>
          )}

          {(activeTab === 'user' || activeTab === 'bmr') && (
            <div className="pt-8">
              <button
                type="submit"
                disabled={updateUser.isLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-5 rounded-2xl shadow-2xl shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-sm"
              >
                {updateUser.isLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const FITNESS_TYPES = ['strength', 'endurance', 'power', 'explosiveness', 'speed_skills', 'flexibility', 'breadth'];
const OVERLOAD_METHODS = ['frequency', 'modality', 'intensity', 'duration'];
const DIET_APPROACHES = ['balanced', 'keto', 'vegan', 'paleo', 'intermittent_fasting', 'mediterranean', 'custom'];
const RAMP_LABELS: Record<number, string> = { '-2': 'Offseason', '-1': 'Taper', '0': 'Maintenance', '1': 'Slow', '2': 'Moderate', '3': 'Aggressive', '4': 'Challenging' };

function GoalsTab() {
  const [subTab, setSubTab] = useState<'body' | 'fitness' | 'stress'>('body');
  const { data: goalData } = useGoal();
  const updateGoal = useUpdateGoal();
  const { data: fitnessGoals } = useFitnessGoals();
  const createFitnessGoal = useCreateFitnessGoal();
  const updateFitnessGoal = useUpdateFitnessGoal();
  const deleteFitnessGoal = useDeleteFitnessGoal();

  const [goalRate, setGoalRate] = useState(goalData?.weekly_rate_kg || 0);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    fitness_type: 'endurance', overload_method: 'intensity', validation_metric: '',
    current_description: '', target_description: '', metric_value: '', target_value: '',
    metric_unit: '', target_date: '', ramp_rate: 0,
  });

  React.useEffect(() => { if (goalData) setGoalRate(goalData.weekly_rate_kg || 0); }, [goalData]);

  const handleSaveWeightGoal = () => {
    const direction = goalRate < 0 ? 'lose' : goalRate > 0 ? 'gain' : 'maintain';
    updateGoal.mutate({ direction, weekly_rate_kg: goalRate });
  };

  const handleAddFitnessGoal = () => {
    createFitnessGoal.mutate({
      ...newGoal,
      metric_value: newGoal.metric_value ? parseFloat(newGoal.metric_value) : null,
      target_value: newGoal.target_value ? parseFloat(newGoal.target_value) : null,
    }, { onSuccess: () => { setAddGoalOpen(false); setNewGoal({ fitness_type: 'endurance', overload_method: 'intensity', validation_metric: '', current_description: '', target_description: '', metric_value: '', target_value: '', metric_unit: '', target_date: '', ramp_rate: 0 }); } });
  };

  const handleRampChange = (goalId: number, ramp_rate: number) => {
    updateFitnessGoal.mutate({ goalId, data: { ramp_rate } });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-2 duration-200">
      {/* Sub-tab nav */}
      <div className="flex border-b border-slate-800">
        {(['body', 'fitness', 'stress'] as const).map(tab => (
          <button key={tab} type="button" onClick={() => setSubTab(tab)}
            className={clsx("px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
              subTab === tab ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300")}>
            {tab === 'body' ? 'Body Composition' : tab === 'fitness' ? 'Fitness Goals' : 'Training Stress'}
          </button>
        ))}
      </div>

      {/* Body Composition */}
      {subTab === 'body' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Weekly Weight Goal</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Set your target weight change per week</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="text-4xl font-black text-emerald-400">{goalRate > 0 ? '+' : ''}{goalRate.toFixed(2)} <span className="text-xl opacity-50 font-normal">kg/wk</span></div>
                <div className="text-sm font-bold text-slate-400">({(goalRate * 1100).toFixed(0)} kcal/day modifier)</div>
              </div>
              <input type="range" min="-1.5" max="1.0" step="0.1" value={goalRate} onChange={(e) => setGoalRate(parseFloat(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              <div className="flex justify-between text-xs text-slate-500 font-bold mt-2">
                <span>Lose 1.5kg</span><span>Maintain</span><span>Gain 1.0kg</span>
              </div>
            </div>
            <button type="button" disabled={updateGoal.isLoading} onClick={handleSaveWeightGoal} className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-widest text-xs">
              {updateGoal.isLoading ? 'Saving...' : 'Update Weight Goal'}
            </button>
          </div>

          {goalData && (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Diet & Macros</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Nutrition targets and eating approach</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Diet Approach</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={goalData.diet_approach || ''} onChange={(e) => updateGoal.mutate({ direction: goalData.direction, weekly_rate_kg: goalData.weekly_rate_kg, diet_approach: e.target.value })}>
                    <option value="">None</option>
                    {DIET_APPROACHES.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Eating Window</label>
                  <div className="flex gap-2">
                    <input type="time" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={goalData.eating_window_start || ''} onChange={(e) => updateGoal.mutate({ direction: goalData.direction, weekly_rate_kg: goalData.weekly_rate_kg, eating_window_start: e.target.value })} />
                    <span className="text-slate-500 self-center">to</span>
                    <input type="time" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={goalData.eating_window_end || ''} onChange={(e) => updateGoal.mutate({ direction: goalData.direction, weekly_rate_kg: goalData.weekly_rate_kg, eating_window_end: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[['Protein (g)', 'target_protein_g', goalData.target_protein_g], ['Carbs (g)', 'target_carbs_g', goalData.target_carbs_g], ['Fat (g)', 'target_fat_g', goalData.target_fat_g], ['Fiber (g)', 'target_fiber_g', goalData.target_fiber_g], ['Hydration (ml)', 'target_hydration_ml', goalData.target_hydration_ml]].map(([label, key, val]) => (
                  <div key={key as string}>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{label as string}</label>
                    <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm" value={val ?? ''} onChange={(e) => updateGoal.mutate({ direction: goalData.direction, weekly_rate_kg: goalData.weekly_rate_kg, [key as string]: parseFloat(e.target.value) || null })} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fitness Goals */}
      {subTab === 'fitness' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Your Fitness Goals</h3>
            <button type="button" onClick={() => setAddGoalOpen(true)} className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors"><Plus size={14} /> Add Goal</button>
          </div>

          {addGoalOpen && (
            <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fitness Type</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={newGoal.fitness_type} onChange={e => setNewGoal({...newGoal, fitness_type: e.target.value})}>
                    {FITNESS_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Overload Method</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={newGoal.overload_method} onChange={e => setNewGoal({...newGoal, overload_method: e.target.value})}>
                    {OVERLOAD_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Validation Metric</label>
                <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={newGoal.validation_metric} onChange={e => setNewGoal({...newGoal, validation_metric: e.target.value})} placeholder="e.g. 1RM bench press, 5K time, FTP" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Current Level</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={newGoal.current_description} onChange={e => setNewGoal({...newGoal, current_description: e.target.value})} placeholder="e.g. Bench 80kg x5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Level</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={newGoal.target_description} onChange={e => setNewGoal({...newGoal, target_description: e.target.value})} placeholder="e.g. Bench 100kg x5" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Current Value</label>
                  <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={newGoal.metric_value} onChange={e => setNewGoal({...newGoal, metric_value: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Value</label>
                  <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={newGoal.target_value} onChange={e => setNewGoal({...newGoal, target_value: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={newGoal.metric_unit} onChange={e => setNewGoal({...newGoal, metric_unit: e.target.value})} placeholder="kg, W, sec" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Date</label>
                  <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={newGoal.target_date} onChange={e => setNewGoal({...newGoal, target_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Ramp Rate</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-slate-100 text-sm" value={newGoal.ramp_rate} onChange={e => setNewGoal({...newGoal, ramp_rate: parseInt(e.target.value)})}>
                    {Array.from({length: 7}, (_, i) => i - 2).map(r => <option key={r} value={r}>{r}: {RAMP_LABELS[r]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAddGoalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold">Cancel</button>
                <button type="button" onClick={handleAddFitnessGoal} disabled={createFitnessGoal.isLoading} className="px-6 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-widest">{createFitnessGoal.isLoading ? 'Saving...' : 'Save Goal'}</button>
              </div>
            </div>
          )}

          {(fitnessGoals || []).length === 0 && !addGoalOpen && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
              <Target size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-sm text-slate-500 font-medium">No fitness goals yet. Add your first one or use the Goal Coach to build them.</p>
            </div>
          )}

          {(fitnessGoals || []).map((g: any) => (
            <div key={g.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400">{g.fitness_type.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 rounded text-slate-400">{g.overload_method}</span>
                  {g.status !== 'active' && <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded", g.status === 'achieved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500')}>{g.status}</span>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => deleteFitnessGoal.mutate(g.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="text-sm text-slate-300 font-bold">{g.target_description}</div>
              <div className="flex items-center gap-4 text-[10px] font-bold">
                {g.metric_value != null && g.target_value != null && (
                  <span className="text-emerald-400">{g.metric_value} → {g.target_value} {g.metric_unit || ''}</span>
                )}
                <span className="text-slate-500">{g.validation_metric}</span>
                <span className="text-slate-500">Ramp: {RAMP_LABELS[g.ramp_rate] || g.ramp_rate}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Training Stress */}
      {subTab === 'stress' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Training Stress Ramp Rates</h3>
          <p className="text-xs text-slate-500">Adjust per-goal ramp rate to control how aggressively you progress training load.</p>
          {(!fitnessGoals || fitnessGoals.length === 0) ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center"><p className="text-sm text-slate-500">Create fitness goals first to set ramp rates.</p></div>
          ) : (
            <div className="space-y-3">
              {(fitnessGoals || []).map((g: any) => (
                <div key={g.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">{g.target_description}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{g.fitness_type.replace(/_/g, ' ')} · {g.validation_metric}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={clsx("text-xs font-black", g.ramp_rate > 0 ? 'text-emerald-400' : g.ramp_rate < 0 ? 'text-amber-400' : 'text-slate-400')}>{RAMP_LABELS[g.ramp_rate] || g.ramp_rate}</span>
                    <input type="range" min="-2" max="4" step="1" value={g.ramp_rate} onChange={(e) => handleRampChange(g.id, parseInt(e.target.value))} className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
