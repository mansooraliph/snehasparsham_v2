/**
 * Fine-grained grants layered on top of the fixed role table (role.enum.ts).
 * A user passes an authorization check if EITHER their role is in the route's
 * @Roles() list OR one of these is in the route's @RequirePermissions() list —
 * so a permission can grant a capability to a role that wouldn't normally have it
 * (e.g. a Volunteer given MANAGE_EVENTS for one campaign) without reassigning
 * their whole role.
 */
export enum Permission {
  MANAGE_USERS = 'manage_users',
  MANAGE_EVENTS = 'manage_events',
  MANAGE_RESPONSES = 'manage_responses',
}
