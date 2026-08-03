import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/useAuthStore';

const RESEND_COOLDOWN_SECONDS = 30;

interface OtpStepProps {
  phone: string;
  onBack: () => void;
  onResend: () => Promise<void>;
}

export function OtpStep({ phone, onBack, onResend }: OtpStepProps) {
  const navigate = useNavigate();
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const redirectTo = await verifyOtp(phone, code);
      navigate(redirectTo, { replace: true });
    } catch {
      // error surfaced via store
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    await onResend();
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-text-muted">
        Enter the 6-digit code sent to <span className="font-medium text-text-primary">{phone}</span>.
        It expires in 5 minutes.
      </p>

      <Field label="OTP Code" htmlFor="otp">
        <Input
          id="otp"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="tracking-[0.5em] text-center"
          required
          autoFocus
        />
      </Field>

      <Button type="submit" loading={isLoading} className="w-full" disabled={code.length !== 6}>
        Verify &amp; Login
      </Button>

      {error && (
        <p className="text-center text-sm text-red" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-text-muted hover:text-text-primary">
          Change number
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="font-medium text-blue hover:underline disabled:cursor-not-allowed disabled:text-text-faint disabled:no-underline"
        >
          {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
        </button>
      </div>
    </form>
  );
}
