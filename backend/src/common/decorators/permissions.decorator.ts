import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';

/** Grants route access to any user holding one of these permissions, regardless
 *  of role — combined with @Roles() using OR semantics (see RolesGuard). */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
