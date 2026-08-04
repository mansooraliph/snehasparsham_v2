import { LayoutDashboard, CalendarDays, Users } from 'lucide-react';
import type { Role } from '@/types/auth';

export interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

const EVENT_ADMIN_ROLES: Role[] = ['super_admin', 'district_state_admin', 'government_official'];
/** Matches USER_ADMIN_ROLES in the backend's users.controller.ts. */
const USER_ADMIN_ROLES: Role[] = ['super_admin', 'district_state_admin'];

/** Per-role sidebar nav — grows as each module ships (see CLAUDE.md build order). */
export function navItemsForRole(role: Role): NavItem[] {
  const items: NavItem[] = [{ label: 'Dashboard', path: DASHBOARD_PATH[role], icon: LayoutDashboard }];

  if (EVENT_ADMIN_ROLES.includes(role)) {
    items.push({ label: 'Events', path: '/admin/events', icon: CalendarDays });
  }
  if (USER_ADMIN_ROLES.includes(role)) {
    items.push({ label: 'Users', path: '/admin/users', icon: Users });
  }
  return items;
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
