import { LayoutDashboard, CalendarDays, ClipboardList, Users, Settings } from 'lucide-react';
import type { Role } from '@/types/auth';
import type { Permission } from '@/types/permission';

export interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  /** false = shown in the sidebar/"More" sheet but not as a mobile bottom tab (default true). */
  tab?: boolean;
}

interface NavUser {
  role: Role;
  permissions: Permission[];
}

const EVENT_ADMIN_ROLES: Role[] = ['super_admin', 'district_state_admin', 'government_official'];
/** Matches USER_ADMIN_ROLES in the backend's users.controller.ts. */
const USER_ADMIN_ROLES: Role[] = ['super_admin', 'district_state_admin'];

/** Per-role (+ extra permission grants) sidebar nav — grows as each module ships (see CLAUDE.md build order). */
export function navItemsForRole({ role, permissions }: NavUser): NavItem[] {
  const items: NavItem[] = [{ label: 'Dashboard', path: DASHBOARD_PATH[role], icon: LayoutDashboard }];

  const canManageEvents = EVENT_ADMIN_ROLES.includes(role) || permissions.includes('manage_events');
  const canManageUsers = USER_ADMIN_ROLES.includes(role) || permissions.includes('manage_users');
  const canManageResponses = EVENT_ADMIN_ROLES.includes(role) || permissions.includes('manage_responses');

  if (canManageEvents) {
    items.push({ label: 'Events', path: '/admin/events', icon: CalendarDays });
  }
  if (canManageResponses) {
    items.push({ label: 'Responses', path: '/admin/responses', icon: ClipboardList });
  }
  if (canManageUsers) {
    items.push({ label: 'Users', path: '/admin/users', icon: Users });
  }
  if (role === 'super_admin') {
    items.push({ label: 'Settings', path: '/admin/settings', icon: Settings, tab: false });
  }
  return items;
}

/** Subset of navItemsForRole shown as mobile bottom tabs — everything else lives behind "More". */
export function primaryNavItemsForRole(user: NavUser): NavItem[] {
  return navItemsForRole(user).filter((item) => item.tab !== false);
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
