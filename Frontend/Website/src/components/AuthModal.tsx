import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { useLogin, useGoogleLogin, useRegister, useResetPassword } from '../hooks/useAuth';
import { useAuth } from '../contexts/AuthContext';

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
  const { promptPhoneModal } = useAuth();
  const loginMutation = useLogin();
  const googleLoginMutation = useGoogleLogin();
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

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const res = await googleLoginMutation.mutateAsync();
      setSuccess('Google Authentication successful! Welcome to GameZ Arena...');
      setTimeout(() => {
        onClose();
        handleResetForm();
        if (!res?.record?.phone || res.record.phone.trim() === '') {
          promptPhoneModal();
        }
      }, 500);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(err.message || 'Google Sign-In failed or popup was closed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
        await loginMutation.mutateAsync({ email, password });
        setSuccess('Authenticated successfully! Loading your gaming dashboard...');
        setTimeout(() => {
          onClose();
          handleResetForm();
        }, 1200);
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

        await registerMutation.mutateAsync({ name, email, phone, password });
        setSuccess('Gamer account created! Welcome to GameZ Arena...');
        setTimeout(() => {
          onClose();
          handleResetForm();
        }, 1200);
      } 
      else if (mode === 'forgot') {
        if (!email) {
          setError('Please provide your registered email address.');
          setIsLoading(false);
          return;
        }
        await resetPasswordMutation.mutateAsync(email);
        setSuccess('Recovery code dispatched successfully!');
      }
    } catch (err: any) {
      if (err?.response?.data) {
        // PocketBase validation error map
        const data = err.response.data;
        const messages = Object.entries(data)
          .map(([field, v]: [string, any]) => `${field.toUpperCase()}: ${v.message}`)
          .join('. ');
        setError(messages || err.message || 'An unexpected error occurred.');
      } else {
        setError(err?.message || 'An unexpected error occurred.');
      }
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

                  {/* Google One-Tap Login Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 font-display font-bold text-xs rounded-xl shadow-md transition hover:scale-[1.01] cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <div className="flex items-center my-3 text-gray-500 text-[10px] font-mono">
                    <div className="flex-1 border-t border-white/10"></div>
                    <span className="px-2 uppercase font-bold text-gray-500">OR WITH EMAIL</span>
                    <div className="flex-1 border-t border-white/10"></div>
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

                  {/* Google One-Tap Register Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white hover:bg-gray-100 text-gray-900 font-display font-bold text-xs rounded-xl shadow-md transition hover:scale-[1.01] cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Sign Up with Google
                  </button>

                  <div className="flex items-center my-3 text-gray-500 text-[10px] font-mono">
                    <div className="flex-1 border-t border-white/10"></div>
                    <span className="px-2 uppercase font-bold text-gray-500">OR REGISTER WITH EMAIL</span>
                    <div className="flex-1 border-t border-white/10"></div>
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
