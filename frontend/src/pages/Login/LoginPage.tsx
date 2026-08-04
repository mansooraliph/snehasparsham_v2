import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/useAuthStore';
import { OtpStep } from './OtpStep';

type LoginMethod = 'password' | 'otp';

export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [method, setMethod] = useState<LoginMethod>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function switchMethod(next: LoginMethod) {
    setMethod(next);
    setOtpSentTo(null);
    clearError();
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const redirectTo = await loginWithPassword(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch {
      // error surfaced via store
    }
  }

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    try {
      await sendOtp(phone.trim());
      setOtpSentTo(phone.trim());
    } catch {
      // error surfaced via store
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4">
      <div className="w-full max-w-[400px] rounded-card bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Disaster Management Portal</h1>
          <p className="mt-1 text-sm text-text-muted">Sign in to continue</p>
        </div>

        <div className="mb-6 flex rounded-card border border-border bg-table-alt p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => switchMethod('password')}
            className={`flex-1 rounded-card py-1.5 transition-colors ${
              method === 'password' ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted'
            }`}
          >
            Email / Password
          </button>
          <button
            type="button"
            onClick={() => switchMethod('otp')}
            className={`flex-1 rounded-card py-1.5 transition-colors ${
              method === 'otp' ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted'
            }`}
          >
            Phone / OTP
          </button>
        </div>

        {method === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-faint hover:text-text-muted"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <div className="text-right">
              <a href="/forgot-password" className="text-sm font-medium text-blue hover:underline">
                Forgot Password?
              </a>
            </div>

            <Button type="submit" loading={isLoading} className="w-full">
              Login
            </Button>

            {error && (
              <p className="text-center text-sm text-red" role="alert">
                {error}
              </p>
            )}
          </form>
        )}

        {method === 'otp' && !otpSentTo && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Field label="Phone Number" htmlFor="phone" hint="10-digit phone number">
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                required
              />
            </Field>

            <Button type="submit" loading={isLoading} className="w-full">
              Send OTP
            </Button>

            {error && (
              <p className="text-center text-sm text-red" role="alert">
                {error}
              </p>
            )}
          </form>
        )}

        {method === 'otp' && otpSentTo && (
          <OtpStep
            phone={otpSentTo}
            onBack={() => setOtpSentTo(null)}
            onResend={() => sendOtp(otpSentTo)}
          />
        )}

        <p className="mt-6 text-center text-sm text-text-muted">
          Browsing as a guest?{' '}
          <a href="/events" className="font-medium text-blue hover:underline">
            View public events
          </a>
        </p>
      </div>
    </div>
  );
}
