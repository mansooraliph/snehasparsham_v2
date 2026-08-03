import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

export interface AuthUser {
  userId: string;
  email: string | null;
  phone: string | null;
  role: Role;
  permissions: Permission[];
  jti?: string;
  tokenExp?: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
