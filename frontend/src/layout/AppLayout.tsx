import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';
import { MobileBottomNav } from './MobileBottomNav';
import { AppHeader } from './AppHeader';

const TITLES: Record<string, string> = {
  '/admin/dashboard': 'Admin Dashboard',
  '/regional/dashboard': 'Regional Dashboard',
  '/official/dashboard': 'Official Dashboard',
  '/field/dashboard': 'Field Dashboard',
  '/volunteer/dashboard': 'Volunteer Dashboard',
  '/partner/dashboard': 'Partner Dashboard',
  '/admin/events': 'Events',
  '/admin/users': 'Users',
  '/admin/response-statuses': 'Response Statuses',
};

function titleForPath(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const prefixMatch = Object.keys(TITLES).find((p) => pathname.startsWith(`${p}/`));
  return prefixMatch ? TITLES[prefixMatch] : 'Disaster Management Portal';
}

/** Authenticated shell: sidebar (desktop) / drawer (mobile) + header + routed content. */
export function AppLayout() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <MobileSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader title={titleForPath(location.pathname)} />
        <main className="flex-1 overflow-y-auto bg-bg-page p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav onMoreClick={() => setDrawerOpen(true)} />
    </div>
  );
}
