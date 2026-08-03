import { LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/stores/useAuthStore';
import { navItemsForRole } from './navConfig';

function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Sidebar contents shared by the desktop rail and the mobile drawer. */
export function AppSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function go(path: string) {
    navigate(path);
    onNavigate?.();
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const items = user ? navItemsForRole(user.role) : [];

  return (
    <div className="flex h-full flex-col bg-header text-white">
      <div className="px-4 py-4">
        <span className="truncate text-sm font-bold text-white">Disaster Management Portal</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <div className="space-y-1">
          {items.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => go(item.path)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-blue text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-700 px-3 py-3">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
            {initials(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-white">{user?.name}</div>
            <div className="truncate text-[10px] capitalize text-slate-500">{user?.role.replace(/_/g, ' ')}</div>
          </div>
          <button type="button" onClick={handleLogout} aria-label="Log out" className="text-slate-400 hover:text-red">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Desktop sidebar (hidden on mobile; AppLayout's drawer takes over there). */
export function AppSidebar() {
  return (
    <aside className="hidden h-full w-60 shrink-0 md:block">
      <AppSidebarContent />
    </aside>
  );
}
