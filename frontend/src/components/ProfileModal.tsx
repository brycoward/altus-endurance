import React, { useState, useEffect } from 'react';
import { useUser, useUpdateUser } from '../hooks/useAltus';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { X, Settings, User as UserIcon, Globe, Calendar, Ruler, Shield, LogOut, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { COMMON_TIMEZONES } from '../utils/timezone-data';

export function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: user } = useUser();
  const updateUser = useUpdateUser();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'user' | 'bmr' | 'security'>('user');
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
        llm_api_key: user.llm_api_key || '',
        llm_provider: user.llm_provider || 'anthropic',
        telegram_username: user.telegram_username || '',
        bmr_override: user.bmr_override || 0,
        unit_system: user.unit_system || 'metric',
      });
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, bmr_override: formData.bmr_override === 0 ? null : formData.bmr_override };
    updateUser.mutate(payload, {
      onSuccess: () => onClose()
    });
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
      // Invalidate user query to show 2FA as enabled
      // queryClient.invalidateQueries(['user']); 
      // hooks already do this on mutation but we are calling api directly here.
      // Better to use a mutation in hooks.
    } catch (err) {
      setTfaError('Invalid token. Please try again.');
    }
  };

  const age = new Date().getFullYear() - formData.birth_year;
  const latestWeight = 75; 
  const calculatedBmr = formData.sex === 'M' 
    ? (10 * latestWeight) + (6.25 * formData.height_cm) - (5 * age) + 5
    : (10 * latestWeight) + (6.25 * formData.height_cm) - (5 * age) - 161;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-100">Settings</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
                onClick={() => { logout(); onClose(); }} 
                className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
            >
                <LogOut className="w-3 h-3" /> Logout
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-800 shrink-0">
          <button 
            onClick={() => setActiveTab('user')}
            className={clsx(
              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
              activeTab === 'user' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Profile
          </button>
          <button 
            onClick={() => setActiveTab('bmr')}
            className={clsx(
              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
              activeTab === 'bmr' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Metabolism
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={clsx(
              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
              activeTab === 'security' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Security
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {activeTab === 'user' && (
                <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <UserIcon className="w-3 h-3" /> Name
                    </label>
                    <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> Birth Year
                    </label>
                    <input
                        type="number"
                        value={formData.birth_year}
                        onChange={(e) => setFormData({ ...formData, birth_year: parseInt(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                    />
                    </div>
                    <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                        <Ruler className="w-3 h-3" /> Height (cm)
                    </label>
                    <input
                        type="number"
                        value={formData.height_cm}
                        onChange={(e) => setFormData({ ...formData, height_cm: parseFloat(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                    />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Sex</label>
                    <select
                        value={formData.sex}
                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                        {!COMMON_TIMEZONES.includes(formData.timezone) && (
                            <option value={formData.timezone}>{formData.timezone}</option>
                        )}
                        {COMMON_TIMEZONES.map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                        ))}
                    </select>
                    </div>
                </div>

                <div className="space-y-1">
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Units</label>
                    <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, unit_system: 'metric' })}
                            className={clsx(
                                "flex-1 py-2 text-xs font-black uppercase tracking-widest transition-all",
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
                                "flex-1 py-2 text-xs font-black uppercase tracking-widest transition-all",
                                formData.unit_system === 'imperial'
                                    ? "bg-emerald-500 text-slate-950"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            Imperial
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">LLM Provider</label>
                        <select
                            value={formData.llm_provider}
                            onChange={(e) => setFormData({ ...formData, llm_provider: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                        >
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="openai">OpenAI (GPT)</option>
                            <option value="deepseek">DeepSeek</option>
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
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                        />
                    </div>
                </div>
                </div>
            )}

            {activeTab === 'bmr' && (
                <div className="space-y-6 animate-in slide-in-from-right-2 duration-200">
                <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Computed BMR</span>
                    <span className="text-lg font-black text-slate-200">{Math.round(calculatedBmr)} <span className="text-xs font-normal text-slate-500">kcal/day</span></span>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Manual BMR Override</label>
                    <div 
                        onClick={() => setFormData({ ...formData, bmr_override: formData.bmr_override ? 0 : Math.round(calculatedBmr) })}
                        className={clsx(
                        "w-10 h-5 rounded-full relative cursor-pointer transition-colors",
                        formData.bmr_override ? "bg-emerald-500" : "bg-slate-700"
                        )}
                    >
                        <div className={clsx(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        formData.bmr_override ? "right-1" : "left-1"
                        )} />
                    </div>
                    </div>

                    {formData.bmr_override > 0 && (
                    <div className="space-y-1">
                        <input
                        type="number"
                        value={formData.bmr_override}
                        onChange={(e) => setFormData({ ...formData, bmr_override: parseFloat(e.target.value) })}
                        className="w-full bg-slate-800 border border-emerald-500/50 rounded-lg px-4 py-2 text-slate-100 text-center font-black text-xl"
                        />
                    </div>
                    )}
                </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-200">
                    <div className="bg-slate-800/50 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                                user?.is_totp_enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-500"
                            )}>
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Two-Factor Auth</h3>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                                    {user?.is_totp_enabled ? "Enabled" : "Disabled"}
                                </p>
                            </div>
                        </div>

                        {!user?.is_totp_enabled && !tfaData && (
                            <button 
                                type="button"
                                onClick={handleTfaSetup}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold py-3 rounded-xl transition-colors"
                            >
                                Setup 2FA
                            </button>
                        )}

                        {tfaData && (
                            <div className="space-y-6 pt-4 border-t border-slate-700/50 animate-in fade-in zoom-in duration-300">
                                <p className="text-[10px] text-slate-400 text-center">Scan this QR code with Google Authenticator or Authy</p>
                                <div className="flex justify-center p-4 bg-white rounded-2xl mx-auto w-fit">
                                    <img src={`data:image/png;base64,${tfaData.qr_code}`} alt="QR Code" className="w-32 h-32" />
                                </div>
                                <div className="space-y-2 text-center">
                                    <code className="text-emerald-400 text-xs font-mono bg-slate-900 px-2 py-1 rounded">Secret: {tfaData.secret}</code>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase text-center">Verification Code</label>
                                    <input 
                                        type="text" 
                                        maxLength={6}
                                        value={tfaToken}
                                        onChange={(e) => setTfaToken(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-black text-white tracking-widest"
                                        placeholder="000000"
                                    />
                                    {tfaError && <p className="text-red-400 text-[10px] text-center">{tfaError}</p>}
                                    <button 
                                        type="button"
                                        onClick={handleTfaVerify}
                                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20"
                                    >
                                        Verify & Enable
                                    </button>
                                </div>
                            </div>
                        )}

                        {tfaSuccess && (
                             <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl text-center">
                                2FA Enabled successfully!
                             </div>
                        )}
                    </div>
                    
                    <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Lock className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-bold text-slate-300">Recovery Codes</span>
                        </div>
                        <button type="button" className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors">
                            View codes
                        </button>
                    </div>
                </div>
            )}

            {(activeTab === 'user' || activeTab === 'bmr') && (
                <div className="pt-4 border-t border-slate-800">
                    <button
                        type="submit"
                        disabled={updateUser.isLoading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {updateUser.isLoading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            )}
            </form>
        </div>
      </div>
    </div>
  );
}
