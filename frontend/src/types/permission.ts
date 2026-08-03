export type Permission = 'manage_users' | 'manage_events' | 'manage_responses';

export const PERMISSION_LABELS: Record<Permission, string> = {
  manage_users: 'Manage Users',
  manage_events: 'Manage Events',
  manage_responses: 'Manage Responses',
};

export const ALL_PERMISSIONS: Permission[] = ['manage_users', 'manage_events', 'manage_responses'];
