import React, { useState } from 'react';
import { api } from '../api/client';
import { clsx } from 'clsx';

export const RecoveryPage: React.FC<{ onBackToLogin: () => void }> = ({ onBackToLogin }) => {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.requestRecovery(email);
      setMessage(res.note || res.message || 'If registered, a code was sent.');
      setStep('verify');
    } catch (err: any) {
      setError('Failed to request recovery.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.verifyRecovery({ email, code, new_password: newPassword });
      setMessage('Password reset successful! You can now log in.');
      setTimeout(onBackToLogin, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid recovery code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />

        <div className="relative">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Account Recovery</h2>
          <p className="text-slate-400 text-center mb-8 text-sm">Reset your password using Telegram or recovery codes</p>

          {step === 'request' ? (
            <form onSubmit={handleRequest} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="name@example.com"
                />
              </div>

              {error && <div className="text-red-400 text-xs text-center">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl transition-all"
              >
                {loading ? "Sending..." : "Request Recovery"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
               {message && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl text-center mb-4">{message}</div>}
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">Recovery Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center font-mono"
                  placeholder="ENTER-CODE-HERE"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="••••••••"
                />
              </div>

              {error && <div className="text-red-400 text-xs text-center">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl transition-all"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <button onClick={onBackToLogin} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
              &larr; Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
