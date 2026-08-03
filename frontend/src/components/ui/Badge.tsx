import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red';

const TONES: Record<Tone, string> = {
  neutral: 'bg-table-alt text-text-muted',
  blue: 'bg-blue-light text-blue',
  green: 'bg-green/10 text-green',
  amber: 'bg-amber/10 text-amber',
  red: 'bg-red/10 text-red',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium capitalize', TONES[tone])}>
      {children}
    </span>
  );
}
