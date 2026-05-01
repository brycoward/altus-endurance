import React, { useState } from 'react';
import { MessageSquare, X, Minus } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { clsx } from 'clsx';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-[400px] h-[600px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-slate-800 p-4 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-100">Altus Assistant</span>
             </div>
             <div className="flex gap-2">
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-700 rounded text-slate-400">
                    <Minus size={16} />
                </button>
             </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatWindow />
          </div>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
            "p-4 rounded-full shadow-2xl transition-all duration-300 transform active:scale-95",
            isOpen 
                ? "bg-slate-800 text-slate-200 rotate-90" 
                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:-translate-y-1"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}
