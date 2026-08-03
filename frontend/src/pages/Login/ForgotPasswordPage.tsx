import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { authApi } from '@/api/auth.api';
import { getApiErrorMessage } from '@/api/http';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setMessage(res.message);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not send reset link'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4">
      <div className="w-full max-w-[400px] rounded-card bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Reset your password</h1>
          <p className="mt-1 text-sm text-text-muted">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {message ? (
          <p className="text-center text-sm text-green">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>

            <Button type="submit" loading={isLoading} className="w-full">
              Send Reset Link
            </Button>

            {error && (
              <p className="text-center text-sm text-red" role="alert">
                {error}
              </p>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-muted">
          <a href="/login" className="font-medium text-blue hover:underline">
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
