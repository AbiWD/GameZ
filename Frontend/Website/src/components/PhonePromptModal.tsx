import React, { useState } from 'react';
import { PhoneCall, ShieldCheck, X, Sparkles } from 'lucide-react';
import pb from '../lib/pocketbase';

interface PhonePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phone: string) => void;
}

export function PhonePromptModal({ isOpen, onClose, onSuccess }: PhonePromptModalProps) {
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      setSaving(true);
      if (pb.authStore.record?.id) {
        await pb.collection('portal_users').update(pb.authStore.record.id, {
          phone: cleanPhone,
        });
      }
      onSuccess(cleanPhone);
      onClose();
    } catch (err) {
      console.error('Failed to update phone:', err);
      onSuccess(cleanPhone);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1.5 pt-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-indigo-500/20 border border-violet-500/30 text-violet-400 flex items-center justify-center mb-3 shadow-inner">
            <PhoneCall className="w-6 h-6 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Complete Your Profile
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Add your phone number for seamless booking updates and priority customer support
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Phone Number</span>
              <span className="text-[10px] text-violet-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Priority Updates
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 font-mono">+91</span>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                required
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/80 text-white placeholder-zinc-500 text-xs font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
              />
            </div>
            {error && <p className="text-[11px] text-rose-400 font-semibold">{error}</p>}
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-800/40 border border-zinc-700/40 space-y-1 text-[11px] text-zinc-400">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-violet-400" /> Service & Communication Guarantee
            </div>
            <div className="leading-normal">We use your number solely for instant booking receipts, schedule modifications, and lounge support.</div>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/20 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
