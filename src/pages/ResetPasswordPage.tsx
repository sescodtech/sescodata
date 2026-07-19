import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth as authApi } from '../lib/api';
import { token as tokenStore } from '../lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const email = params.get('email');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-shb-gold-soft/30 via-white to-shb-gold-soft/20 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-red-500" size={40} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500 mb-8">This password reset link is missing required information.</p>
          <Link to="/login" className="shb-btn-primary block w-full text-center">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword(token, email, password);
      tokenStore.set(res.token);
      setSuccess(true);
      setTimeout(() => navigate('/app'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-shb-gold-soft/30 via-white to-shb-gold-soft/20 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-500" size={40} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Password Reset Successful!</h1>
          <p className="text-gray-500 mb-8">Your password has been updated. Redirecting to dashboard...</p>
          <div className="flex items-center justify-center gap-2 text-shb-gold-dark font-bold">
            <Loader2 className="animate-spin" size={20} />
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-shb-gold-soft/30 via-white to-shb-gold-soft/20 flex flex-col justify-center items-center p-4 sm:p-6">
      <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={18} /> Back to login
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-shb-gold to-shb-gold-dark shadow-lg" style={{ boxShadow: 'var(--shadow-gold)' }}>
              <span className="text-shb-navy font-extrabold text-2xl leading-none font-display">S</span>
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-gray-900 font-display">SescoHub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-600 text-sm sm:text-base">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-shb-gold focus:border-transparent outline-none transition-all text-base"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      password.length < 6 ? 'bg-red-400 w-1/5' :
                      password.length < 8 ? 'bg-amber-400 w-3/5' :
                      /[0-9]/.test(password) && /[A-Z]/.test(password) ? 'bg-green-500 w-full' : 'bg-shb-gold w-4/5'
                    }`}
                  />
                </div>
                <span className="text-[11px] font-bold text-gray-500 shrink-0">
                  {password.length < 6 ? 'Too short' : password.length < 8 ? 'Fair' : /[0-9]/.test(password) && /[A-Z]/.test(password) ? 'Strong' : 'Good'}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-shb-gold focus:border-transparent outline-none transition-all text-base"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="shb-btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-base mt-8"
          >
            {isLoading ? (
              <><Loader2 className="animate-spin" size={20} /> Resetting...</>
            ) : (
              'Reset Password'
            )}
          </button>

          <p className="text-center text-gray-600 text-sm">
            Remember your password?{' '}
            <Link to="/login" className="text-shb-gold-dark font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
