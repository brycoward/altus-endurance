import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { clsx } from 'clsx';

export const LoginPage: React.FC<{ onRegisterClick: () => void, onRecoveryClick: () => void }> = ({ onRegisterClick, onRecoveryClick }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (requires2fa) {
        if (!tempUserId) return;
        const res = await api.login2fa(tempUserId, totpToken);
        const userData = await api.getUser(); // This will use the new token from interceptor? 
        // Wait, the interceptor uses localStorage. We should set it first or pass it.
        localStorage.setItem('altus_token', res.access_token);
        const finalUser = await api.getUser();
        login(res.access_token, finalUser);
      } else {
        const res = await api.login({ email, password });
        if (res.requires_2fa) {
          setRequires2fa(true);
          setTempUserId(res.user_id);
        } else {
          localStorage.setItem('altus_token', res.access_token);
          const userData = await api.getUser();
          login(res.access_token, userData);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/40 rotate-12">
                <span className="text-3xl font-black text-slate-950 -rotate-12">A</span>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-white mb-2">Welcome Back</h2>
          <p className="text-slate-400 text-center mb-8 text-sm">Optimize your performance with Altus</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!requires2fa ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                    <button type="button" onClick={onRecoveryClick} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Forgot?</button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Two-Factor Code</label>
                <input
                  type="text"
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-center tracking-[0.5em] text-xl font-bold"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
                <p className="text-slate-500 text-center mt-4 text-xs">Enter the code from your authenticator app</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                "w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? "Authenticating..." : (requires2fa ? "Verify & Log In" : "Sign In")}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-slate-400 text-sm">
              Don't have an account?{" "}
              <button onClick={onRegisterClick} className="text-emerald-400 hover:text-emerald-300 font-bold">Create one</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
