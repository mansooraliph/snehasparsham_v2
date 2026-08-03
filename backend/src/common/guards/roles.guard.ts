import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';
import type { AuthUser } from '../decorators/current-user.decorator';

/**
 * Central RBAC check — reads @Roles() and @RequirePermissions() metadata.
 * When both are set on a route, access is granted if EITHER matches (a
 * permission is a grant on top of the role table, not an additional
 * restriction). A route with neither decorator is open to any authenticated user.
 */
@Injectable()
export class RolesGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length && !requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;
    const roleOk = !!requiredRoles?.length && !!user && requiredRoles.includes(user.role);
    const permissionOk =
      !!requiredPermissions?.length &&
      !!user &&
      requiredPermissions.some((p) => user.permissions?.includes(p));

    if (!roleOk && !permissionOk) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action',
      });
    }
    return true;
  }
}
