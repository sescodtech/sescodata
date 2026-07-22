import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Lock, User, Phone, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth as authApi } from '../lib/api';
import AuthLayout from '../components/ui/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { login, register, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const isValidEmail = email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // Matches the backend's 8-character minimum (AuthService.register/resetPassword/changePassword).
  const passwordStrength = (() => {
    if (!password) return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length < 8) return { label: 'Too short', color: 'bg-red-400', width: '20%' };
    if (score <= 1) return { label: 'Weak', color: 'bg-red-400', width: '35%' };
    if (score <= 2) return { label: 'Fair', color: 'bg-amber-400', width: '60%' };
    if (score === 3) return { label: 'Good', color: 'bg-shb-gold', width: '80%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  })();
  const passwordsMatch = mode !== 'register' || !confirmPassword || password === confirmPassword;

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
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (!agreedToTerms) {
          throw new Error('Please agree to the Terms & Conditions to continue');
        }
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
      <div className="min-h-screen bg-shb-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-shb-gold-dark" size={32} />
      </div>
    );
  }

  const title = mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : 'Forgot password?';
  const subtitle =
    mode === 'login' ? 'Sign in to keep managing data, airtime and bills.'
    : mode === 'register' ? 'One wallet for data, airtime, cable TV, electricity and exam PINs.'
    : 'Enter your email and we\'ll send you a reset link.';

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      footer={
        <p className="text-gray-500 text-[13px]">
          {mode === 'login' ? (
            <>New to SescoHub?{' '}
              <button onClick={switchMode} className="text-shb-gold-dark font-bold hover:underline touch-manipulation">Create a free account</button>
            </>
          ) : mode === 'register' ? (
            <>Already have an account?{' '}
              <button onClick={switchMode} className="text-shb-gold-dark font-bold hover:underline touch-manipulation">Sign in</button>
            </>
          ) : (
            <>Remembered it?{' '}
              <button onClick={switchMode} className="text-shb-gold-dark font-bold hover:underline touch-manipulation">Back to sign in</button>
            </>
          )}
        </p>
      }
    >
      <AnimatePresence mode="wait">
        <motion.form
          key={mode}
          onSubmit={handleSubmit}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-4"
        >
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-start gap-2.5">
              <AlertCircle size={17} className="shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="rounded-2xl border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm flex items-start gap-2.5">
              <CheckCircle2 size={17} className="shrink-0 mt-0.5" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <Input
              label="Full name"
              icon={<User size={17} />}
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Adebayo Samuel" required
            />
          )}

          <Input
            label="Email address"
            icon={<Mail size={17} />}
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            error={!isValidEmail ? 'Enter a valid email address' : undefined}
            placeholder="name@example.com" required
          />

          {mode === 'register' && (
            <Input
              label="Phone number"
              icon={<Phone size={17} />}
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
            />
          )}

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[13px] font-bold text-gray-700">Password</label>
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
              <Input
                icon={<Lock size={17} />}
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={8}
                trailing={
                  <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="text-gray-400 hover:text-gray-600 p-1">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />
              {mode === 'register' && passwordStrength && (
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 shrink-0">{passwordStrength.label}</span>
                </div>
              )}
            </div>
          )}

          {mode === 'register' && (
            <Input
              label="Confirm password"
              icon={<Lock size={17} />}
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              error={!passwordsMatch ? 'Passwords do not match' : undefined}
              placeholder="••••••••" required minLength={8}
              trailing={
                <button type="button" onClick={() => setShowConfirmPassword(s => !s)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="text-gray-400 hover:text-gray-600 p-1">
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              }
            />
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-shb-gold-dark focus:ring-shb-gold shrink-0"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                I agree to SescoHub's{' '}
                <Link to="/terms" target="_blank" className="text-shb-gold-dark font-bold hover:underline">Terms &amp; Conditions</Link>
                {' '}and{' '}
                <Link to="/privacy" target="_blank" className="text-shb-gold-dark font-bold hover:underline">Privacy Policy</Link>
              </span>
            </label>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isLoading}
            disabled={mode === 'register' && (!passwordsMatch || !agreedToTerms || !isValidEmail)}
            icon={!isLoading ? <ArrowRight size={18} /> : undefined}
            className="!flex-row-reverse mt-2"
          >
            {isLoading
              ? (mode === 'login' ? 'Signing in…' : mode === 'register' ? 'Creating account…' : 'Sending link…')
              : (mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create free account' : 'Send reset link')}
          </Button>
        </motion.form>
      </AnimatePresence>
    </AuthLayout>
  );
}
