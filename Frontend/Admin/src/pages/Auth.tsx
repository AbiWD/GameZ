import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, updateUserPassword, requestPasswordReset, user, isAdmin, isSetupRequired } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isResetting = user?.force_password_reset === true;

  useEffect(() => {
    if (isSetupRequired === true) {
      navigate('/setup');
    } else if (isSetupRequired === false && user && isAdmin && !user.force_password_reset) {
      navigate('/admin');
    }
  }, [user, isAdmin, navigate, isSetupRequired]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      if (!data?.record?.force_password_reset) {
        toast({
          title: 'Success',
          description: 'Signed in successfully',
        });
        setTimeout(() => navigate('/admin'), 500);
      } else {
        toast({
          title: 'Action Required',
          description: 'Please reset your temporary password',
        });
      }
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your account email address.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await requestPasswordReset(email);

    if (error) {
      toast({
        title: 'Notice',
        description: 'If an account exists with this email, a reset link has been dispatched.',
      });
    } else {
      toast({
        title: 'Reset Link Dispatched 📩',
        description: `Check your inbox at ${email} for password reset instructions.`,
      });
    }
    setResetSent(true);
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { error } = await updateUserPassword(password, newPassword);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Password updated successfully! Redirecting...',
      });
      navigate('/admin');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10 bg-card/60 backdrop-blur-xl border border-border/80 p-8 sm:p-10 rounded-3xl shadow-2xl transition-all">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">GameZ</h1>
          <p className="text-muted-foreground font-medium">
            {isResetting 
              ? "Reset Temporary Password" 
              : isForgotPassword 
              ? "Recover Account Access" 
              : "Admin Dashboard Access"}
          </p>
        </div>

        {isResetting ? (
          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="old-password" className="text-sm font-bold ml-1 text-muted-foreground">Current Password</Label>
              <div className="relative">
                <Input
                  id="old-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Temporary password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`rounded-xl bg-secondary border border-border px-5 py-6 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground ${!showPassword ? 'tracking-widest' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-bold ml-1 text-muted-foreground">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className={`rounded-xl bg-secondary border border-border px-5 py-6 pr-12 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground ${!showNewPassword ? 'tracking-widest' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-bold ml-1 text-muted-foreground">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className={`rounded-xl bg-secondary border border-border px-5 py-6 pr-12 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground ${!showConfirmPassword ? 'tracking-widest' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full rounded-full bg-primary hover:bg-primary/90 px-8 py-7 h-auto text-primary-foreground font-bold text-lg shadow-lg shadow-primary/10 mt-6 transition-all active:scale-[0.98]" disabled={loading}>
              {loading ? 'Updating...' : 'Set New Password'}
            </Button>
          </form>
        ) : isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-sm font-bold ml-1 text-muted-foreground">Account Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="admin@gamez.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl bg-secondary border border-border px-5 py-6 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                Enter your staff or admin email address to receive password reset instructions.
              </p>
            </div>

            <Button type="submit" className="w-full rounded-full bg-primary hover:bg-primary/90 px-8 py-7 h-auto text-primary-foreground font-bold text-base shadow-lg shadow-primary/10 mt-4 transition-all active:scale-[0.98]" disabled={loading}>
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-xs font-bold text-primary hover:underline focus:outline-none"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="signin-email" className="text-sm font-bold ml-1 text-muted-foreground">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="admin@gamez.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl bg-secondary border border-border px-5 py-6 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password" className="text-sm font-bold ml-1 text-muted-foreground">Password</Label>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs font-bold text-primary hover:text-primary/80 focus:outline-none"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`rounded-xl bg-secondary border border-border px-5 py-6 pr-12 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground ${!showPassword ? 'tracking-widest' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full rounded-full bg-primary hover:bg-primary/90 px-8 py-7 h-auto text-primary-foreground font-bold text-lg shadow-lg shadow-primary/10 mt-6 transition-all active:scale-[0.98]" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
