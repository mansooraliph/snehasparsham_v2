import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { TokenPayload } from '../token-payload.interface';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';

/** Validates ACCESS tokens (Authorization: Bearer ...). */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-access-secret-change-me',
    });
  }

  async validate(payload: TokenPayload & { exp?: number }): Promise<AuthUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN_TYPE', message: 'Invalid token' });
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({ code: 'TOKEN_REVOKED', message: 'Account no longer exists' });
    }
    if (user.token_version !== payload.tokenVersion) {
      throw new UnauthorizedException({
        code: 'TOKEN_SUPERSEDED',
        message: 'Your session is no longer valid. Please log in again.',
      });
    }

    return {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      // Read fresh from the DB (not baked into the JWT) so a permission grant/
      // revoke takes effect immediately instead of waiting for token refresh.
      permissions: user.permissions,
      tokenExp: payload.exp,
    };
  }
}
