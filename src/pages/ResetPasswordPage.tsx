import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight, KeyRound } from 'lucide-react';
import { auth as authApi } from '../lib/api';
import { token as tokenStore } from '../lib/api';
import AuthLayout from '../components/ui/AuthLayout';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import EmptyState from '../components/EmptyState';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const email = params.get('email');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token || !email) {
    return (
      <AuthLayout title="Invalid link" subtitle="This password reset link is missing required information.">
        <EmptyState
          icon={AlertCircle}
          variant="error"
          title="Link incomplete or expired"
          description="Request a new reset link from the sign-in page."
          action={<Link to="/login" className="mt-2"><Button size="sm">Back to sign in</Button></Link>}
        />
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    // Matches the backend's 8-character minimum (AuthService).
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword(token, email, password);
      tokenStore.set(res.token);
      setSuccess(true);
      setTimeout(() => navigate('/app'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Password updated" subtitle="Taking you to your dashboard now.">
        <EmptyState
          icon={CheckCircle2}
          variant="success"
          title="You're all set"
          description="Your password has been changed successfully."
          action={
            <div className="flex items-center justify-center gap-2 text-shb-gold-dark font-bold text-sm mt-1">
              <Loader2 className="animate-spin" size={16} /> Redirecting…
            </div>
          }
        />
      </AuthLayout>
    );
  }

  const strength = (() => {
    if (!password) return null;
    if (password.length < 8) return { label: 'Too short', color: 'bg-red-400', width: '20%' };
    if (password.length < 10) return { label: 'Fair', color: 'bg-amber-400', width: '55%' };
    if (/[0-9]/.test(password) && /[A-Z]/.test(password)) return { label: 'Strong', color: 'bg-green-500', width: '100%' };
    return { label: 'Good', color: 'bg-shb-gold', width: '80%' };
  })();

  return (
    <AuthLayout eyebrow="Reset password" title="Choose a new password" subtitle={`Setting a new password for ${email}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-start gap-2.5">
            <AlertCircle size={17} className="shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <div>
          <PasswordInput
            label="New password"
            icon={<KeyRound size={17} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
          />
          {strength && (
            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
              </div>
              <span className="text-[11px] font-bold text-gray-500 shrink-0">{strength.label}</span>
            </div>
          )}
        </div>

        <PasswordInput
          label="Confirm new password"
          icon={<Lock size={17} />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmPassword && confirmPassword !== password ? 'Passwords do not match' : undefined}
          placeholder="••••••••"
          required
          minLength={8}
          autoComplete="new-password"
        />

        <Button type="submit" fullWidth size="lg" loading={isLoading} icon={!isLoading ? <ArrowRight size={18} /> : undefined} className="!flex-row-reverse mt-2">
          {isLoading ? 'Resetting…' : 'Reset password'}
        </Button>

        <p className="text-center text-gray-500 text-[13px] pt-1">
          Remember your password?{' '}
          <Link to="/login" className="text-shb-gold-dark font-bold hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
