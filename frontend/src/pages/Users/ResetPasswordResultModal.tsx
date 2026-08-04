import { useState } from 'react';
import { Check, Copy, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { buildWhatsAppLink } from '@/lib/utils/whatsapp';
import type { UserRecord } from '@/types/user';

interface ResetPasswordResultModalProps {
  user: UserRecord;
  password: string;
  onClose: () => void;
}

/** Same priority AuthService.findByIdentifier resolves login with — whichever
 *  is set becomes the identifier the user actually types in to sign in. */
function loginIdentifier(user: UserRecord): string {
  return user.email ?? user.phone ?? user.username ?? user.name;
}

// WhatsApp renders *text* as bold and _text_ as italic, and preserves the
// blank lines below as-is — this is what gives the message its spacing.
function buildMessage(user: UserRecord, password: string): string {
  const loginUrl = `${window.location.origin}/login`;
  return `Hi *${user.name}* 👋

Your password for the *Disaster Management Portal* has been reset.

🔗 Login: ${loginUrl}
👤 Username: *${loginIdentifier(user)}*
🔑 New Password: *${password}*

_Please log in and change your password as soon as possible._`;
}

/** Shown once right after an admin resets a user's password — the plaintext is
 *  never persisted or fetchable again after this, so this is the only chance to hand it off. */
export function ResetPasswordResultModal({ user, password, onClose }: ResetPasswordResultModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-card bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Password Reset</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-text-muted">
          A new password was generated for <span className="font-medium text-text-primary">{user.name}</span>. It won't
          be shown again — copy it or send it now.
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-card border border-border bg-table-head px-3 py-2">
          <code className="flex-1 text-sm font-semibold tracking-wide text-text-primary">{password}</code>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy password"
            className="text-text-faint hover:text-blue"
          >
            {copied ? <Check className="h-4 w-4 text-green" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {!user.phone && (
          <p className="mt-3 text-sm text-amber">
            No phone number on file — WhatsApp will open its contact picker instead.
          </p>
        )}

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() =>
              window.open(buildWhatsAppLink(user.phone, buildMessage(user, password)), '_blank', 'noopener,noreferrer')
            }
          >
            <MessageCircle className="h-4 w-4" />
            Send via WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
