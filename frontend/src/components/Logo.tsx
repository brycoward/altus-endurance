import React from 'react';

export function Logo({ size = 40, collapsed = false }: { size?: number; collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="flex items-center justify-center mx-auto overflow-hidden rounded-full bg-slate-800 border border-slate-700 shadow-lg" style={{ width: size, height: size }}>
        <img
          src="/Altus_logo.png"
          alt="Altus"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 overflow-hidden rounded-full bg-slate-800 border border-slate-700 shadow-lg" style={{ width: size, height: size }}>
        <img
          src="/Altus_logo.png"
          alt="Altus"
          className="w-full h-full object-contain"
        />
      </div>
      <div>
        <div className="text-sm font-black text-[rgb(var(--text-primary))] uppercase tracking-tighter">Altus</div>
        <div className="text-[8px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-widest">Performance</div>
      </div>
    </div>
  );
}
