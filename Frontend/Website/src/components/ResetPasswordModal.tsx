import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, CheckCircle2, ShieldAlert, RefreshCw, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useConfirmPasswordReset } from '../hooks/useAuth';

interface ResetPasswordModalProps {
  onSuccessLogin?: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ onSuccessLogin }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const confirmResetMutation = useConfirmPasswordReset();

  useEffect(() => {
    const parseToken = () => {
      // Check query params (?token=...)
      const searchParams = new URLSearchParams(window.location.search);
      let foundToken = searchParams.get('token');

      // Check hash fragment (#reset-password?token=... or #/reset-password?token=...)
      if (!foundToken && window.location.hash) {
        const hashStr = window.location.hash;
        const qIndex = hashStr.indexOf('?');
        if (qIndex !== -1) {
          const hashParams = new URLSearchParams(hashStr.substring(qIndex + 1));
          foundToken = hashParams.get('token');
        }
      }

      if (foundToken) {
        setToken(foundToken);
        setIsOpen(true);
      }
    };

    parseToken();
    window.addEventListener('popstate', parseToken);
    return () => window.removeEventListener('popstate', parseToken);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Clean up token from URL without full reload
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError(null);
    setSuccess(null);

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await confirmResetMutation.mutateAsync({
        token,
        password,
        passwordConfirm: confirmPassword,
      });

      setSuccess('Your password has been updated successfully! You can now log in.');
      setTimeout(() => {
        handleClose();
        if (onSuccessLogin) onSuccessLogin();
      }, 1500);
    } catch (err: any) {
      console.error('Password reset confirm error:', err);
      const errMsg = err?.message || err?.response?.message || 'Password reset token is invalid or has expired. Please request a new reset link.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
          onClick={handleClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-cyber-gray border border-cyber-purple/40 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(139,92,246,0.2)] overflow-hidden text-left"
        >
          {/* Top glowing gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-purple via-cyber-cyan to-cyber-purple" />

          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyber-purple/20 border border-cyber-purple/40 text-cyber-cyan shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold text-white">Create New Password</h2>
              <p className="text-xs text-gray-400 mt-0.5">Enter a strong new password for your gamer account.</p>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl bg-cyber-neon/10 border border-cyber-neon/30 text-cyber-neon text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-bold">
                New Password (Min 8 Characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-cyber-lightgray border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-bold">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-cyber-lightgray border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition focus:outline-none cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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
                  Updating Password...
                </>
              ) : (
                'Save New Password'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
