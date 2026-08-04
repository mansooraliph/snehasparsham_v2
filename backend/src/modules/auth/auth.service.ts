import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PasswordResetToken } from '../../database/entities/password-reset-token.entity';
import { User } from '../../database/entities/user.entity';
import { UserStatus } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { TokenPayload } from './token-payload.interface';

const BCRYPT_ROUNDS = 12;
const ACCESS_EXPIRES_SECONDS = 60 * 60;
const RESET_TOKEN_EXPIRY_MINUTES = 30;

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    region: string | null;
    permissions: Permission[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
  ) {}

  // ──────────────────────────── EMAIL + PASSWORD ───────────────────────────

  async login(identifier: string, password: string): Promise<AuthResult> {
    const invalid = () =>
      new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });

    const user = await this.users.findByIdentifier(identifier);
    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      throw invalid();
    }

    this.assertUsableAccount(user);
    await this.users.updateLastLogin(user.id);

    return this.issueSession(user);
  }

  // ──────────────────────────────── PHONE + OTP ────────────────────────────

  async sendOtp(phone: string): Promise<void> {
    await this.otp.send(phone);
  }

  async verifyOtpAndLogin(phone: string, code: string): Promise<AuthResult> {
    await this.otp.verify(phone, code);
    // Self-registration on first successful OTP (login-module.md §9.2 — public
    // users can self-register; here it's implicit since phone login has no
    // separate signup step for the Public/Citizen role).
    const user = await this.users.findOrCreateByPhone(phone);
    this.assertUsableAccount(user);
    await this.users.updateLastLogin(user.id);

    return this.issueSession(user);
  }

  // ────────────────────────────── FORGOT / RESET ───────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    // Never reveal whether the email exists.
    if (!user) return;

    const rawToken = uuidv4();
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    await this.resetTokens.save(
      this.resetTokens.create({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt }),
    );

    // No email/SMTP provider wired up yet — logging the reset link lets the
    // flow be exercised end-to-end in dev.
    // eslint-disable-next-line no-console
    console.log(`Password reset token for ${email}: ${rawToken} (expires in ${RESET_TOKEN_EXPIRY_MINUTES}m)`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const invalid = () =>
      new UnauthorizedException({ code: 'INVALID_RESET_TOKEN', message: 'Invalid or expired reset token' });

    const candidates = await this.resetTokens.find({
      where: { consumed_at: IsNull(), expires_at: MoreThan(new Date()) },
      order: { created_at: 'DESC' },
      select: { id: true, user_id: true, token_hash: true },
    });

    let match: PasswordResetToken | undefined;
    for (const candidate of candidates) {
      if (await bcrypt.compare(token, candidate.token_hash)) {
        match = candidate;
        break;
      }
    }
    if (!match) throw invalid();

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.setPasswordHash(match.user_id, passwordHash);
    await this.resetTokens.update({ id: match.id }, { consumed_at: new Date() });
  }

  // ──────────────────────────────── SESSION ────────────────────────────────

  async refresh(payload: TokenPayload): Promise<AuthResult> {
    const user = await this.users.findByIdWithSecrets(payload.sub);
    if (!user || !user.refresh_token_hash || user.token_version !== payload.tokenVersion) {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_INVALID', message: 'Invalid or expired refresh token' });
    }
    this.assertUsableAccount(user);
    return this.issueSession(user);
  }

  async logout(userId: string): Promise<void> {
    await this.users.setRefreshTokenHash(userId, null);
  }

  me(userId: string) {
    return this.users.findById(userId);
  }

  // ──────────────────────────────── HELPERS ────────────────────────────────

  private assertUsableAccount(user: User): void {
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException({ code: 'ACCOUNT_SUSPENDED', message: 'This account has been suspended.' });
    }
    if (user.status === UserStatus.PENDING_APPROVAL) {
      throw new ForbiddenException({
        code: 'ACCOUNT_PENDING_APPROVAL',
        message: 'Your account is pending admin approval.',
      });
    }
  }

  private async issueSession(user: User): Promise<AuthResult> {
    const tokens = await this.signTokens({
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      region: user.region,
      tokenVersion: user.token_version,
    });
    const refreshHash = await bcrypt.hash(tokens.refreshToken, BCRYPT_ROUNDS);
    await this.users.setRefreshTokenHash(user.id, refreshHash);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        region: user.region,
        permissions: user.permissions,
      },
    };
  }

  private async signTokens(
    base: Omit<TokenPayload, 'type' | 'jti'>,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessToken = await this.jwt.signAsync(
      { ...base, type: 'access', jti: uuidv4() } satisfies TokenPayload,
      {
        secret: this.config.get<string>('JWT_SECRET') ?? 'dev-access-secret-change-me',
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '1h',
      } as JwtSignOptions,
    );
    const refreshToken = await this.jwt.signAsync(
      { ...base, type: 'refresh', jti: uuidv4() } satisfies TokenPayload,
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret-change-me',
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      } as JwtSignOptions,
    );
    return { accessToken, refreshToken, expiresIn: ACCESS_EXPIRES_SECONDS };
  }
}
