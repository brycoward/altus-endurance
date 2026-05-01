import React, { useState } from 'react';
import { api } from '../api/client';
import { clsx } from 'clsx';
import { COMMON_TIMEZONES } from '../utils/timezone-data';

export const RegisterPage: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    birth_year: 1990,
    height_cm: 175,
    sex: 'M',
    timezone: 'UTC'
  });
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.register(formData);
      setRecoveryCodes(res.recovery_codes);
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : (detail?.[0]?.msg || JSON.stringify(detail) || err.message || 'Registration failed.');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (recoveryCodes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
          
          <div className="relative text-center">
             <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/40 mx-auto mb-6">
                <svg className="w-8 h-8 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
            <p className="text-slate-400 mb-6 text-sm">Save these recovery codes in a safe place. You will need them if you lose access to your account.</p>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {recoveryCodes.map(code => (
                <div key={code} className="bg-slate-900 border border-white/5 rounded-xl py-3 px-2 font-mono text-emerald-400 text-sm select-all">
                  {code}
                </div>
              ))}
            </div>
            
            <button
              onClick={onLoginClick}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl transition-all"
            >
              Continue to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 py-12">
      <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />

        <div className="relative">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Create Account</h2>
          <p className="text-slate-400 text-center mb-8 text-sm">Join Altus and start tracking your performance</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="john@example.com"
                  />
                </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="••••••••"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Birth Year</label>
                  <input
                    type="number"
                    value={formData.birth_year}
                    onChange={(e) => setFormData({...formData, birth_year: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Height (cm)</label>
                  <input
                    type="number"
                    value={formData.height_cm}
                    onChange={(e) => setFormData({...formData, height_cm: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Sex</label>
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({...formData, sex: e.target.value})}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white appearance-none"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white appearance-none"
                  >
                    {COMMON_TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                "w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all mt-4",
                loading && "opacity-70"
              )}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{" "}
              <button onClick={onLoginClick} className="text-emerald-400 hover:text-emerald-300 font-bold">Sign In</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
