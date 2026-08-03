import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import pb from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// Helper to safely parse Base64URL JWT payload
function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Password strength validation helper
function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.';
  return null;
}

export default function ResetPassword() {
  const [resetToken, setResetToken] = useState<string>('');
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = searchParams.get('token');

    if (!tokenFromUrl) {
      setInvalidToken(true);
      return;
    }

    // 1. Capture token into component state BEFORE sanitizing URL
    setResetToken(tokenFromUrl);

    // 2. Decode JWT payload to extract user email
    const payload = parseJwtPayload(tokenFromUrl);
    if (!payload || !payload.email) {
      setInvalidToken(true);
    } else {
      setTargetEmail(payload.email);
    }

    // 3. Immediately sanitize address bar to remove ?token=... from browser history
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetToken) {
      setInvalidToken(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New password and confirmation password do not match.',
        variant: 'destructive',
      });
      return;
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      toast({
        title: 'Weak Password',
        description: strengthError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Reset password on staff_accounts collection
      await pb.collection('staff_accounts').confirmPasswordReset(resetToken, newPassword, newPassword);

      // 2. Single-use token logic succeeded (HTTP 204). Attempt auto-login using exact same password variable
      try {
        const authData = await pb.collection('staff_accounts').authWithPassword(targetEmail, newPassword);
        
        if (authData.record?.role === 'admin' || authData.record?.collectionName === '_superusers') {
          toast({
            title: 'Account Set Up Successfully 🎉',
            description: 'Your permanent admin credentials have been saved. Welcome to GameZ Arena!',
          });
          setTimeout(() => navigate('/admin'), 600);
        } else {
          toast({
            title: 'Password Updated',
            description: 'Password updated successfully! Please log in with your new password.',
          });
          setTimeout(() => navigate('/auth'), 600);
        }
      } catch (authErr) {
        // Distinct failure fallback if auto-login fails
        toast({
          title: 'Password Updated Successfully',
          description: 'Password updated successfully! Please log in with your new password.',
        });
        setTimeout(() => navigate('/auth'), 800);
      }
    } catch (err: any) {
      console.error('Password reset failed:', err);
      // Uniform Anti-Enumeration Error
      setInvalidToken(true);
    } finally {
      setLoading(false);
    }
  };

  if (invalidToken) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-[440px] z-10 bg-card/70 backdrop-blur-xl border border-rose-500/20 p-8 sm:p-10 rounded-3xl shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Link Invalid or Expired</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This setup link is invalid, expired, or has already been used. Please request a new invitation link from your administrator.
            </p>
          </div>
          <Button
            onClick={() => navigate('/auth')}
            className="w-full rounded-full bg-primary hover:bg-primary/90 py-6 text-primary-foreground font-bold text-sm shadow-lg transition-all"
          >
            Return to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10 bg-card/60 backdrop-blur-xl border border-border/80 p-8 sm:p-10 rounded-3xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-2">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Set Admin Password</h1>
          <p className="text-xs text-muted-foreground font-medium">
            Create a permanent secret password for <span className="text-foreground font-semibold">{targetEmail}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-pass" className="text-xs font-bold text-muted-foreground ml-1">New Permanent Password</Label>
            <div className="relative">
              <Input
                id="new-pass"
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-xl bg-secondary border border-border px-5 py-6 pr-12 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pass" className="text-xs font-bold text-muted-foreground ml-1">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-pass"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="rounded-xl bg-secondary border border-border px-5 py-6 pr-12 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border space-y-1 text-[11px] text-muted-foreground">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" /> Password Requirements
            </div>
            <div>Minimum 8 characters with at least 1 uppercase, 1 lowercase, 1 number & 1 special character.</div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary hover:bg-primary/90 py-6 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/10 transition-all active:scale-[0.98]"
          >
            {loading ? 'Saving Credentials...' : 'Save Password & Access Dashboard'}
          </Button>
        </form>
      </div>
    </div>
  );
}
