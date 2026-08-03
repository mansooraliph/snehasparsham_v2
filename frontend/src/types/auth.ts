import type { Permission } from './permission';

export type Role =
  | 'super_admin'
  | 'district_state_admin'
  | 'government_official'
  | 'field_responder'
  | 'volunteer'
  | 'ngo_partner'
  | 'public_citizen';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  region: string | null;
  permissions: Permission[];
}

export interface SessionResponse {
  accessToken: string;
  user: AuthUser;
  redirectTo: string;
}

/** Mirrors backend ROLE_DASHBOARD_PATH (login-module.md §2). */
export const ROLE_DASHBOARD_PATH: Record<Role, string> = {
  super_admin: '/admin/dashboard',
  district_state_admin: '/regional/dashboard',
  government_official: '/official/dashboard',
  field_responder: '/field/dashboard',
  volunteer: '/volunteer/dashboard',
  ngo_partner: '/partner/dashboard',
  public_citizen: '/portal',
};

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  district_state_admin: 'District/State Admin',
  government_official: 'Government Official',
  field_responder: 'Field Responder',
  volunteer: 'Volunteer',
  ngo_partner: 'NGO/Partner Organization',
  public_citizen: 'Public/Citizen',
};
