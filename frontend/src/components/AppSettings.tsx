import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { clsx } from 'clsx';

export function AppSettings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex-1 overflow-y-auto bg-[rgb(var(--bg-primary))] p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tighter">App Settings</h1>
          <p className="text-[rgb(var(--text-secondary))] font-medium">Configure application-wide preferences and display options.</p>
        </div>

        <div className="bg-[rgb(var(--bg-secondary))] border border-[rgb(var(--border))] p-8 rounded-3xl space-y-6 shadow-[var(--card-shadow)]">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black text-[rgb(var(--text-primary))] uppercase tracking-widest">Dark Mode</h3>
                    <p className="text-xs text-[rgb(var(--text-muted))] font-medium">Use dark interface for reduced eye strain</p>
                </div>
                <button 
                  onClick={toggleTheme}
                  className={clsx(
                    "w-12 h-6 rounded-full relative transition-colors duration-200 focus:outline-none",
                    theme === 'dark' ? "bg-[rgb(var(--emerald))]" : "bg-slate-300"
                  )}
                >
                    <div className={clsx(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200",
                      theme === 'dark' ? "right-1" : "left-1"
                    )} />
                </button>
            </div>

            <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                <div>
                    <h3 className="text-sm font-black text-[rgb(var(--text-primary))] uppercase tracking-widest">Push Notifications</h3>
                    <p className="text-xs text-[rgb(var(--text-muted))] font-medium">Coming soon for performance alerts</p>
                </div>
                <div className="w-12 h-6 bg-[rgb(var(--border))] rounded-full relative">
                    <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
