import type { Role } from './auth';
import type { EventStatus } from './event';
import type { UserStatus } from './user';

export interface DashboardStats {
  events: {
    total: number;
    byStatus: Record<EventStatus, number>;
    upcoming: number;
  };
  users: {
    total: number;
    byRole: Record<Role, number>;
    byStatus: Record<UserStatus, number>;
  };
  totalRegistrations: number;
}
