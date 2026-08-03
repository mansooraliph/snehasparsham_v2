/** Matches the role table in disaster-management-portal-full.md §2. */
export enum Role {
  SUPER_ADMIN = 'super_admin',
  DISTRICT_STATE_ADMIN = 'district_state_admin',
  GOVERNMENT_OFFICIAL = 'government_official',
  FIELD_RESPONDER = 'field_responder',
  VOLUNTEER = 'volunteer',
  NGO_PARTNER = 'ngo_partner',
  PUBLIC_CITIZEN = 'public_citizen',
}

/** Where each role lands after login (login-module.md §2). */
export const ROLE_DASHBOARD_PATH: Record<Role, string> = {
  [Role.SUPER_ADMIN]: '/admin/dashboard',
  [Role.DISTRICT_STATE_ADMIN]: '/regional/dashboard',
  [Role.GOVERNMENT_OFFICIAL]: '/official/dashboard',
  [Role.FIELD_RESPONDER]: '/field/dashboard',
  [Role.VOLUNTEER]: '/volunteer/dashboard',
  [Role.NGO_PARTNER]: '/partner/dashboard',
  [Role.PUBLIC_CITIZEN]: '/portal',
};

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING_APPROVAL = 'pending_approval',
}
