import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClass?: string;
}

/** Right-side slide-over used for create/edit forms across the app. */
export function Drawer({ open, onClose, title, children, widthClass = 'max-w-xl' }: DrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className={`relative flex h-full w-full ${widthClass} flex-col bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
