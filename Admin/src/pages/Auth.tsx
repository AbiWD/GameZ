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
  const [loading, setLoading] = useState(false);
  const { signIn, updateUserPassword, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isResetting = user?.force_password_reset === true;

  useEffect(() => {
    if (user && isAdmin && !user.force_password_reset) {
      navigate('/admin');
    }
  }, [user, isAdmin, navigate]);

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
      } else {
        toast({
          title: 'Action Required',
          description: 'Please reset your temporary password',
        });
      }
    }

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="w-full max-w-md bg-card rounded-3xl p-10 shadow-xl border border-border">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Dream House</h1>
          <p className="text-muted-foreground font-medium">
            {isResetting ? "Reset Temporary Password" : "Admin Dashboard Access"}
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
        ) : (
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="signin-email" className="text-sm font-bold ml-1 text-muted-foreground">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="admin@dreamhousehomestay.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl bg-secondary border border-border px-5 py-6 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password" className="text-sm font-bold ml-1 text-muted-foreground">Password</Label>
                <a href="#" className="text-xs font-bold text-primary hover:text-primary/80">Forgot?</a>
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
