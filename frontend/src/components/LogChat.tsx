import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useLogFood } from '../hooks/useAltus';

export function LogChat() {
  const [message, setMessage] = useState('');
  const logFood = useLogFood();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    // Placeholder logic for now
    console.log("Sending to Altus.Log:", message);
    setMessage('');
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
      <form 
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto relative group"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
        <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="pl-4 text-emerald-500">
            <Sparkles size={20} />
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Log something messy... 'I had 3 eggs and a large coffee'"
            className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-4 text-slate-200 placeholder-slate-600 font-medium"
          />
          <button
            type="submit"
            className="pr-4 text-slate-500 hover:text-emerald-400 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
