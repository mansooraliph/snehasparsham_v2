import type { Role } from './auth';
import type { Permission } from './permission';

export type UserStatus = 'active' | 'suspended' | 'pending_approval';

export interface UserRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  region: string | null;
  status: UserStatus;
  permissions: Permission[];
  last_login_at: string | null;
  created_at: string;
}

export interface CreateUserInput {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: Role;
  region?: string;
  status?: UserStatus;
  permissions?: Permission[];
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string;
  newPassword?: string;
  role?: Role;
  region?: string;
  status?: UserStatus;
  permissions?: Permission[];
}
