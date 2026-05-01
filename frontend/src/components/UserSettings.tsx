import React, { useState, useEffect } from 'react';
import { useUser, useUpdateUser, useGoal, useUpdateGoal } from '../hooks/useAltus';
import { api } from '../api/client';
import { User as UserIcon, Globe, Calendar, Ruler, Shield, Lock } from 'lucide-react';
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
    llm_api_key: '',
    llm_provider: 'anthropic',
    telegram_username: '',
    bmr_override: 0,
    activity_multiplier: 1.2
  });

  const { data: goalData } = useGoal();
  const updateGoal = useUpdateGoal();
  const [goalRate, setGoalRate] = useState<number>(0);

  useEffect(() => {
    if (goalData) {
      setGoalRate(goalData.weekly_rate_kg || 0);
    }
  }, [goalData]);

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
        llm_api_key: user.llm_api_key || '',
        llm_provider: user.llm_provider || 'anthropic',
        telegram_username: user.telegram_username || '',
        bmr_override: user.bmr_override || 0,
        activity_multiplier: user.activity_multiplier || 1.2
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

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">LLM Provider</label>
                <select
                  value={formData.llm_provider}
                  onChange={(e) => setFormData({ ...formData, llm_provider: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="google">Google (Gemini)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">LLM API Key</label>
                <input
                  type="password"
                  placeholder="Paste key..."
                  value={formData.llm_api_key}
                  onChange={(e) => setFormData({ ...formData, llm_api_key: e.target.value })}
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

           {activeTab === 'goals' && (
             <div className="space-y-6 animate-in slide-in-from-right-2 duration-200">
               <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                 <div>
                   <h3 className="text-lg font-black text-white uppercase tracking-tight">Weekly Weight Goal</h3>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                     Set your target weight change per week
                   </p>
                 </div>
                 
                 <div className="space-y-8">
                   <div className="flex justify-between items-end">
                      <div className="text-4xl font-black text-emerald-400">
                        {goalRate > 0 ? '+' : ''}{goalRate.toFixed(2)} <span className="text-xl opacity-50 font-normal">kg/wk</span>
                      </div>
                      <div className="text-sm font-bold text-slate-400">
                        ({(goalRate * 1100).toFixed(0)} kcal/day modifier)
                      </div>
                   </div>
                   
                   <div className="relative pt-4">
                     <input 
                       type="range" 
                       min="-1.5" 
                       max="1.0" 
                       step="0.1" 
                       value={goalRate}
                       onChange={(e) => setGoalRate(parseFloat(e.target.value))}
                       className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                     />
                     <div className="flex justify-between text-xs text-slate-500 font-bold mt-2">
                       <span>Lose 1.5kg</span>
                       <span>Maintain</span>
                       <span>Gain 1.0kg</span>
                     </div>
                   </div>
                   
                   <button
                     type="button"
                     disabled={updateGoal.isLoading}
                     onClick={() => {
                        const direction = goalRate < 0 ? 'lose' : goalRate > 0 ? 'gain' : 'maintain';
                        updateGoal.mutate({ direction, weekly_rate_kg: goalRate });
                     }}
                     className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-widest text-sm"
                   >
                     {updateGoal.isLoading ? 'Saving...' : 'Update Goal'}
                   </button>
                 </div>
               </div>
             </div>
           )}

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
