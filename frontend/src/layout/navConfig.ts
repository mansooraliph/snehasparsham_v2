import { LayoutDashboard, CalendarDays } from 'lucide-react';
import type { Role } from '@/types/auth';

export interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

const ADMIN_ROLES: Role[] = ['super_admin', 'district_state_admin', 'government_official'];

/** Per-role sidebar nav — grows as each module ships (see CLAUDE.md build order). */
export function navItemsForRole(role: Role): NavItem[] {
  const dashboard: NavItem = { label: 'Dashboard', path: DASHBOARD_PATH[role], icon: LayoutDashboard };

  if (ADMIN_ROLES.includes(role)) {
    return [dashboard, { label: 'Events', path: '/admin/events', icon: CalendarDays }];
  }
  return [dashboard];
}

const DASHBOARD_PATH: Record<Role, string> = {
  super_admin: '/admin/dashboard',
  district_state_admin: '/regional/dashboard',
  government_official: '/official/dashboard',
  field_responder: '/field/dashboard',
  volunteer: '/volunteer/dashboard',
  ngo_partner: '/partner/dashboard',
  public_citizen: '/portal',
};
