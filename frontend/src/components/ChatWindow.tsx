import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api, client } from '../api/client';
import { clsx } from 'clsx';
import { Sparkles, Bot, User, Image, X, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  source: 'altus.log' | 'altus.coach' | 'user';
  text: string;
  details?: string[];
}

export function ChatWindow() {
  const [mode, setMode] = useState<'log' | 'coach'>('log');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      source: 'altus.coach',
      text: "I'm Altus. Log your meals and workouts in Log mode, or switch to Coach for training advice. Tip: you can paste or drag food photos!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = useCallback((file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageSelect(file);
        return;
      }
    }
  }, [handleImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text && !imageFile) return;

    const userMsg: Message = { 
      id: Date.now().toString(), 
      source: 'user', 
      text: text || (imageFile ? '[Photo attached]' : ''),
      details: imageFile ? [imageFile.name] : undefined
    };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = text;
    const currentImage = imageFile;
    setInput('');
    setImageFile(null);
    setImagePreview(null);
    setIsLoading(true);

    try {
      let resp;
      if (mode === 'log') {
        resp = await api.chatLogWithImage(currentInput, currentImage || undefined);
      } else {
        resp = await api.chatLog({ message: currentInput });
        const coachResp = await clientCoach({ message: currentInput });
        resp = { source: 'altus.coach', reply: coachResp.reply, handoff: coachResp.handoff };
      }

      const botMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        source: resp.source, 
        text: resp.reply 
      };
      setMessages(prev => [...prev, botMsg]);

      if (resp.handoff?.forwarded_reply) {
        const handoffMsg: Message = {
          id: (Date.now() + 2).toString(),
          source: 'altus.coach',
          text: resp.handoff.forwarded_reply
        };
        setMessages(prev => [...prev, handoffMsg]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      let msg = "Sorry, I ran into an error. Please try again.";
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as any).response?.data?.detail;
        if (typeof resp === 'string' && resp.includes('API key')) {
          msg = "Your LLM API key is missing or invalid. Go to App Settings to configure it.";
        }
      }
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        source: 'altus.coach',
        text: msg
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
      {/* Mode Tabs */}
      <div className="flex border-b border-slate-800 shrink-0 px-2">
        <button
          onClick={() => setMode('log')}
          className={clsx(
            "flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-colors",
            mode === 'log'
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-slate-600 hover:text-slate-400"
          )}
        >
          Log Entry
        </button>
        <button
          onClick={() => setMode('coach')}
          className={clsx(
            "flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-colors",
            mode === 'coach'
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-slate-600 hover:text-slate-400"
          )}
        >
          Ask Coach
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex-1 overflow-y-auto p-4 space-y-4 pb-36"
      >
        {messages.map((m) => (
          <div key={m.id} className={clsx(
            "flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-200",
            m.source === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
          )}>
            <div className={clsx(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              m.source === 'user' ? "bg-slate-800" : m.source === 'altus.log' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/20 text-blue-400 border border-blue-500/20"
            )}>
              {m.source === 'user' ? <User size={14} /> : m.source === 'altus.log' ? <Sparkles size={14} /> : <Bot size={14} />}
            </div>
            <div className={clsx(
              "px-4 py-2.5 rounded-2xl text-xs leading-relaxed",
              m.source === 'user' ? "bg-blue-600 text-white font-medium" : "bg-slate-900 border border-slate-800 text-slate-300 shadow-lg"
            )}>
              <div className="whitespace-pre-wrap">{m.text}</div>
              {m.details && m.details.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700/50">
                  {m.details.map((d, i) => (
                    <div key={i} className="text-[10px] text-slate-400">{d}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto animate-in fade-in duration-200">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Loader2 size={14} className="animate-spin" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl text-xs text-slate-500 bg-slate-900 border border-slate-800">
              {mode === 'log' ? 'Analyzing...' : 'Thinking...'}
            </div>
          </div>
        )}
      </div>

      {/* Chat Input Pinned to Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-3 ml-4 relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="h-16 rounded-lg border border-slate-700 object-cover"
            />
            <button 
              onClick={clearImage}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] hover:bg-red-400 transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        )}

        <form 
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative group"
        >
          <div className={clsx(
            "absolute -inset-0.5 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000",
            mode === 'log' ? "bg-gradient-to-r from-emerald-500 to-blue-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"
          )}></div>
          <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Image Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageSelect(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "pl-4 transition-colors",
                mode === 'log' ? "text-emerald-500 hover:text-emerald-400" : "text-slate-600"
              )}
              title="Attach food photo"
            >
              <Image size={18} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'log' 
                ? "Log food and activity... '3 eggs, 1h ride' or paste a photo"
                : "Ask Altus.Coach for advice..."}
              className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-3.5 text-slate-200 placeholder-slate-600 text-sm"
              disabled={isLoading}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

async function clientCoach(data: { message: string }): Promise<{ source: string; reply: string; handoff: null }> {
  return client.post('/api/coach', data).then((r: any) => r.data);
}
