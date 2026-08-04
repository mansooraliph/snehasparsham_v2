import { MoreHorizontal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/stores/useAuthStore';
import { primaryNavItemsForRole } from './navConfig';

interface Props {
  onMoreClick: () => void;
}

/** App-style bottom tab bar shown on mobile in place of the sidebar's primary nav. */
export function MobileBottomNav({ onMoreClick }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const items = user ? primaryNavItemsForRole(user) : [];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium',
              active ? 'text-blue' : 'text-text-muted',
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onMoreClick}
        className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-text-muted"
      >
        <MoreHorizontal className="h-5 w-5" />
        More
      </button>
    </nav>
  );
}
