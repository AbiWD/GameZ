import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { useLogin, useRegister, useResetPassword } from '../hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  initialMode = 'login' 
}) => {
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const resetPasswordMutation = useResetPassword();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  
  // Forms state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Status feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  const handleSwitchMode = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    handleResetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          setError('Please enter both your email address and password.');
          setIsLoading(false);
          return;
        }
        const res = await loginMutation.mutateAsync({ email, password });
        if (res.success) {
          setSuccess('Authenticated successfully! Loading your gaming dashboard...');
          setTimeout(() => {
            onClose();
            handleResetForm();
          }, 1200);
        } else {
          setError(res.error || 'Failed to authenticate.');
        }
      } 
      else if (mode === 'register') {
        if (!name || !email || !phone || !password || !confirmPassword) {
          setError('Please fill in all registration fields.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please verify.');
          setIsLoading(false);
          return;
        }
        if (phone.replace(/\D/g, '').length < 10) {
          setError('Please enter a valid 10-digit mobile number.');
          setIsLoading(false);
          return;
        }

        const res = await registerMutation.mutateAsync({ name, email, phone, password });
        if (res.success) {
          setSuccess('Gamer account created! Welcome to GameZ Arena...');
          setTimeout(() => {
            onClose();
            handleResetForm();
          }, 1200);
        } else {
          setError(res.error || 'Failed to create account.');
        }
      } 
      else if (mode === 'forgot') {
        if (!email) {
          setError('Please provide your registered email address.');
          setIsLoading(false);
          return;
        }
        const res = await resetPasswordMutation.mutateAsync(email);
        if (res.success) {
          setSuccess(res.message || 'Recovery code dispatched successfully!');
        } else {
          setError(res.error || 'Email address not found in our database.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="relative w-full max-w-md bg-cyber-gray border border-cyber-purple/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(139,92,246,0.15)] overflow-hidden z-10"
          >
            {/* Top Glowing bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-purple via-cyber-cyan to-cyber-pink" />
            
            {/* Background design elements */}
            <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-cyber-purple/10 blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 h-24 w-24 rounded-full bg-cyber-cyan/10 blur-xl pointer-events-none" />

            {/* Header close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon / Brand branding */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-cyber-purple to-cyber-cyan text-white shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-display text-sm font-bold tracking-widest text-white uppercase">
                Gamer Portal Access
              </span>
            </div>

            {/* Error / Success Feedback */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3.5 rounded-xl bg-cyber-pink/10 border border-cyber-pink/30 flex items-start gap-2 text-xs text-cyber-pink font-medium leading-relaxed"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3.5 rounded-xl bg-cyber-neon/10 border border-cyber-neon/30 flex items-start gap-2 text-xs text-cyber-neon font-medium leading-relaxed"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </motion.div>
            )}

            {/* Action forms */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {mode === 'login' && (
                <>
                  <div className="text-left mb-2">
                    <h2 className="font-display text-xl font-extrabold text-white">Welcome Back, Player!</h2>
                    <p className="text-xs text-gray-400 mt-1">Authenticate your credentials to access saved slots and active desks.</p>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-bold">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. abhilashbangera97@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-cyber-lightgray border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                        Secret Password
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSwitchMode('forgot')}
                        className="text-[10px] font-mono text-cyber-cyan hover:underline hover:text-cyber-cyan/80 focus:outline-none"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-cyber-lightgray border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white font-display font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyber-purple/10 hover:scale-[1.02] transition duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Authenticating System...
                      </>
                    ) : (
                      'Initialize Session'
                    )}
                  </button>

                  <div className="text-center pt-4 border-t border-white/5 text-xs text-gray-400">
                    Need an active gaming pass?{' '}
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('register')}
                      className="text-cyber-purple font-bold hover:underline"
                    >
                      Register New Gamer
                    </button>
                  </div>
                </>
              )}

              {mode === 'register' && (
                <>
                  <div className="text-left mb-2">
                    <h2 className="font-display text-xl font-extrabold text-white">Create Gamer Account</h2>
                    <p className="text-xs text-gray-400 mt-1">Unlock live schedules, instant session extensions, and real-time confirmations.</p>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-bold">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Abhilash Bangera"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-cyber-lightgray border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple"
                      />
                    </div>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-bold">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. customer@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-cyber-lightgray border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple"
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-bold">
                      Phone Number (10 Digits)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-cyber-lightgray border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple font-mono"
                      />
                    </div>
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-bold">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2.5 bg-cyber-lightgray border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-bold">
                        Confirm
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2.5 bg-cyber-lightgray border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white font-display font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyber-purple/10 hover:scale-[1.02] transition duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Creating Profile...
                      </>
                    ) : (
                      'Register and Play'
                    )}
                  </button>

                  <div className="text-center pt-4 border-t border-white/5 text-xs text-gray-400">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('login')}
                      className="text-cyber-purple font-bold hover:underline"
                    >
                      Login Account
                    </button>
                  </div>
                </>
              )}

              {mode === 'forgot' && (
                <>
                  <div className="text-left mb-2">
                    <h2 className="font-display text-xl font-extrabold text-white">Password Recovery</h2>
                    <p className="text-xs text-gray-400 mt-1">Submit your registered email address below, and our server will dispatch a simulated password reset PIN.</p>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-bold">
                      Gamer Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. abhilashbangera97@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-cyber-lightgray border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white font-display font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyber-purple/10 hover:scale-[1.02] transition duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Sending Request...
                      </>
                    ) : (
                      'Dispatch Recovery Mail'
                    )}
                  </button>

                  <div className="text-center pt-4 border-t border-white/5 text-xs text-gray-400">
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('login')}
                      className="text-cyber-purple font-bold hover:underline"
                    >
                      Back to Secure Login
                    </button>
                  </div>
                </>
              )}

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
