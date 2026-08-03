import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { TokenPayload } from '../token-payload.interface';

function fromCookie(req: Request): string | null {
  return req?.cookies?.refresh_token ?? null;
}

/** Validates REFRESH tokens read from the HttpOnly `refresh_token` cookie. */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: fromCookie,
      ignoreExpiration: false,
      passReqToCallback: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret-change-me',
    });
  }

  async validate(payload: TokenPayload): Promise<TokenPayload> {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN_TYPE', message: 'Invalid token' });
    }
    return payload;
  }
}
