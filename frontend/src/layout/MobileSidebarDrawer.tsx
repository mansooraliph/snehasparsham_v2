import { X } from 'lucide-react';
import { AppSidebarContent } from './AppSidebar';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebarDrawer({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-60 shadow-lg">
        <AppSidebarContent onNavigate={onClose} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-3 top-4 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
