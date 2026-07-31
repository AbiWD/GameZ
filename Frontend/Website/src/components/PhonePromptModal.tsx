import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Smartphone, CheckCircle2, MessageSquare } from 'lucide-react';
import { pb } from '@/lib/pocketbase';

interface PhonePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (phone: string) => void;
}

export function PhonePromptModal({ isOpen, onClose, onSuccess }: PhonePromptModalProps) {
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit WhatsApp phone number.');
      return;
    }

    try {
      setSaving(true);
      const user = pb.authStore.model;
      if (user) {
        await pb.collection('portal_users').update(user.id, {
          phone: cleanPhone,
        });
      }
      onSuccess(cleanPhone);
      onClose();
    } catch (err) {
      setError('Failed to save phone number. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl border border-border bg-card w-[95vw] max-w-md p-6">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Get Instant WhatsApp Ticket</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Add your WhatsApp number for instant mobile check-in</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>WhatsApp Number</span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Instant Ticket Delivery
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground font-mono">+91</span>
              <Input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                required
                className="pl-12 rounded-xl border-border bg-background text-xs font-mono font-bold tracking-wider"
              />
            </div>
            {error && <p className="text-[11px] text-rose-500 font-semibold">{error}</p>}
          </div>

          <div className="p-3 rounded-2xl bg-secondary/40 border border-border space-y-1 text-[11px] text-muted-foreground">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-primary" /> Privacy Consent Notice
            </div>
            <div>We will only use this number to dispatch your digital booking confirmation ticket and lounge updates.</div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl border-border text-xs"
            >
              Skip for Now
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Saving...' : 'Save & Get Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
