import { useState } from 'react';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { UserRecord } from '@/types/user';

interface ResetPasswordDialogProps {
  open: boolean;
  user: UserRecord | null;
  onConfirm: (password?: string) => Promise<void>;
  onCancel: () => void;
}

/** Lets the admin either type a specific new password or leave it blank to
 *  auto-generate one — either way the caller shows the result via ResetPasswordResultModal. */
export function ResetPasswordDialog({ open, user, onConfirm, onCancel }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !user) return null;

  function resetAndCancel() {
    setPassword('');
    setError(null);
    onCancel();
  }

  async function handleConfirm() {
    if (password && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(password || undefined);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={resetAndCancel} aria-hidden />
      <div className="relative w-full max-w-sm rounded-card bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-text-primary">Reset Password</h2>
        <p className="mt-2 text-sm text-text-muted">
          Set a new password for <span className="font-medium text-text-primary">{user.name}</span>. Their
          current password stops working immediately.
        </p>

        <div className="mt-4">
          <Field label="New Password" htmlFor="resetPassword" hint="Optional — leave blank to auto-generate one">
            <Input
              id="resetPassword"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to auto-generate"
            />
          </Field>
          {error && <p className="mt-1.5 text-sm text-red">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={resetAndCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} loading={isSubmitting}>
            Reset Password
          </Button>
        </div>
      </div>
    </div>
  );
}
