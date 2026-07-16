import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ArrowLeft, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth as authApi } from '../lib/api';

export default function LoginPage() {
  const location = useLocation();
  // FIXED: this always defaulted to 'login' regardless of path, so every
  // "Create Free Account" CTA linking to /signup landed on the sign-in form.
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(
    location.pathname === '/signup' ? 'register' : 'login',
  );
  useDocumentTitle(location.pathname === '/signup' ? 'Create Account' : 'Sign In');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { login, register, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      // Single-tenant platform: one admin console (was two role-specific routes).
      navigate(user.backendRole === 'admin' ? '/app/admin' : '/app', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const switchMode = () => {
    setError(null);
    setSuccessMsg(null);
    if (mode === 'forgot') setMode('login');
    else setMode(mode === 'login' ? 'register' : 'login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        const user = await login(email, password);
        navigate(user?.backendRole === 'admin' ? '/app/admin' : '/app');
      } else if (mode === 'register') {
        await register(name, email, password, phone);
        navigate('/app');
      } else if (mode === 'forgot') {
        await authApi.requestPasswordReset(email);
        setSuccessMsg('If this email exists in our system, a password reset link will be sent shortly.');
        setEmail('');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading indicator while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-shb-gold-soft/30 via-white to-shb-gold-soft/20 flex items-center justify-center">
        <Loader2 className="animate-spin text-shb-gold-dark" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-shb-gold-soft/30 via-white to-shb-gold-soft/20 flex">
      {/* Left Pane – Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="max-w-md text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center bg-gradient-to-br from-shb-gold to-shb-gold-dark shadow-2xl" style={{ boxShadow: 'var(--shadow-gold)' }}>
                <span className="text-shb-navy font-extrabold text-4xl leading-none font-display">S</span>
              </div>
              <span className="font-extrabold text-4xl tracking-tight text-gray-900">SescoHub</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-extrabold text-gray-900 mb-4"
          >
            Welcome Back
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-gray-600 mb-8"
          >
            One wallet for data, airtime, cable TV, electricity and exam PINs
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-6 text-sm"
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 bg-shb-gold-soft/50">
                <span className="text-shb-gold-dark font-bold text-lg">📱</span>
              </div>
              <p className="font-semibold text-gray-900">Data & Airtime</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 bg-shb-gold-soft/50">
                <span className="text-shb-gold-dark font-bold text-lg">📺</span>
              </div>
              <p className="font-semibold text-gray-900">TV & Electricity</p>
            </div>
          </motion.div>
        </div>

        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-shb-gold/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-shb-gold/15 rounded-full -ml-32 -mb-32 blur-3xl" />
      </div>

      {/* Right Pane – Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12">
        {/* Desktop back link */}
        <Link to="/" className="hidden lg:inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-8">
          <ArrowLeft size={18} /> Back to home
        </Link>

        {/* Mobile branding header */}
        <div className="lg:hidden text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-shb-gold to-shb-gold-dark shadow-lg" style={{ boxShadow: 'var(--shadow-gold)' }}>
              <span className="text-shb-navy font-extrabold text-2xl leading-none font-display">S</span>
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-gray-900 font-display">SescoHub</span>
          </div>
          <p className="text-gray-600 text-sm">One wallet for every digital service</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
                {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                {mode === 'login'
                  ? 'Welcome back! Please sign in to your account.'
                  : mode === 'register'
                  ? 'Join thousands of satisfied customers today.'
                  : 'Enter your email to receive a password reset link.'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="rounded-2xl border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm flex items-start gap-3">
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {mode === 'register' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text" value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 sm:py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-shb-gold focus:border-transparent outline-none transition-all text-base"
                      placeholder="Adebayo Samuel" required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 sm:py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-shb-gold focus:border-transparent outline-none transition-all text-base"
                    placeholder="name@example.com" required
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 sm:py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-shb-gold focus:border-transparent outline-none transition-all text-base"
                      placeholder="08012345678"
                    />
                  </div>
                </div>
              )}

              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setError(null); }}
                        className="text-xs text-shb-gold-dark font-bold hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-4 sm:py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-shb-gold focus:border-transparent outline-none transition-all text-base"
                      placeholder="••••••••" required minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit" disabled={isLoading}
                className="shb-btn-primary w-full py-4 sm:py-3 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-base touch-manipulation"
              >
                {isLoading ? (
                  <><Loader2 className="animate-spin" size={20} /> {mode === 'login' ? 'Signing in...' : mode === 'register' ? 'Creating account...' : 'Sending reset link...'}</>
                ) : (
                  mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Free Account' : 'Send Reset Link'
                )}
              </button>
            </form>

            <p className="mt-6 sm:mt-8 text-center text-gray-600 text-sm px-4">
              {mode === 'login' ? (
                <>Don't have an account? <button onClick={switchMode} className="text-shb-gold-dark font-bold hover:underline touch-manipulation">Create one free</button></>
              ) : mode === 'register' ? (
                <>Already have an account? <button onClick={switchMode} className="text-shb-gold-dark font-bold hover:underline touch-manipulation">Sign in</button></>
              ) : (
                <>Remember your password? <button onClick={switchMode} className="text-shb-gold-dark font-bold hover:underline touch-manipulation">Sign in</button></>
              )}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}