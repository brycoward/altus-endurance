import React, { useState, useRef, useCallback } from 'react';
import { Send, Sparkles, Image, X, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { clsx } from 'clsx';

export function LogChat() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text && !imageFile) return;

    setIsLoading(true);
    setResult(null);

    try {
      const resp = await api.chatLogWithImage(text, imageFile || undefined);
      setResult(resp.reply);
      if (resp.handoff?.forwarded_reply) {
        setResult(prev => (prev || '') + '\n\n' + resp.handoff.forwarded_reply);
      }
      setMessage('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Log error:', err);
      setResult('Error processing log. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 relative inline-block">
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

      {/* Result */}
      {result && (
        <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 animate-in slide-in-from-bottom-2 duration-200 whitespace-pre-wrap">
          {result}
        </div>
      )}

      <form 
        onSubmit={handleSubmit}
        onPaste={handlePaste}
        className="max-w-3xl mx-auto relative group"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
        <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
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
              imagePreview ? "text-emerald-400" : "text-slate-500 hover:text-emerald-400"
            )}
            title="Attach food photo"
          >
            <Image size={18} />
          </button>
          <div className="pl-3 text-emerald-500">
            <Sparkles size={18} />
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Log something messy... '3 eggs, large coffee, 1h ride'"
            className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-3.5 text-slate-200 placeholder-slate-600 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || (!message.trim() && !imageFile)}
            className="pr-4 text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-30"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
}
