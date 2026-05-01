import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { clsx } from 'clsx';
import { Sparkles, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  source: 'altus.log' | 'altus.coach' | 'user';
  text: string;
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-greeting on load
  useEffect(() => {
    const greet = async () => {
      try {
        await api.chatLog({ message: "Hello! Give me a quick status update.", is_internal_call: true }); 
        setMessages([{
          id: 'greeting',
          source: 'altus.coach',
          text: "Welcome back! I've reviewed your latest digest. How can I help you today?"
        }]);
      } catch (e) {
        setMessages([{
          id: 'error',
          source: 'altus.coach',
          text: "Altus is online and ready. Log your entries below."
        }]);
      }
    };
    greet();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), source: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');

    try {
      const resp = await api.chatLog({ message: currentInput });
      
      const botMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        source: resp.source, 
        text: resp.reply 
      };
      setMessages(prev => [...prev, botMsg]);

      if (resp.handoff) {
        const handoffMsg: Message = {
          id: (Date.now() + 2).toString(),
          source: 'altus.coach',
          text: resp.handoff.forwarded_reply
        };
        setMessages(prev => [...prev, handoffMsg]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
      
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 pb-32"
      >
        {messages.map((m) => (
          <div key={m.id} className={clsx(
            "flex gap-4 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300",
            m.source === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
          )}>
            <div className={clsx(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg",
              m.source === 'user' ? "bg-slate-800" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
            )}>
              {m.source === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={clsx(
              "px-4 py-3 rounded-2xl text-sm leading-relaxed",
              m.source === 'user' ? "bg-blue-600 text-white font-medium" : "bg-slate-900 border border-slate-800 text-slate-300 shadow-xl"
            )}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input Pinned to Bottom */}
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Log your day or ask Coach for advice..."
              className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-4 text-slate-200 placeholder-slate-600 font-medium"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
