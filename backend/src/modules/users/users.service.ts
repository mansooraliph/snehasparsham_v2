import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { User } from '../../database/entities/user.entity';
import { Role, UserStatus } from '../../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 12;
/** Unambiguous charset — no 0/O/1/I — since this gets read off a WhatsApp message and typed in by hand. */
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTempPassword(length = 10): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)];
  }
  return password;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.password_hash')
      .where('u.email = :email', { email: email.toLowerCase().trim() })
      .getOne();
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.password_hash')
      .where('u.phone = :phone', { phone })
      .getOne();
  }

  findByUsername(username: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.password_hash')
      .where('u.username = :username', { username })
      .getOne();
  }

  /** Login accepts email, phone, OR username — tried in that order, first match wins. */
  async findByIdentifier(identifier: string): Promise<User | null> {
    const value = identifier.trim();
    return (
      (await this.findByEmail(value)) ??
      (await this.findByPhone(value)) ??
      (await this.findByUsername(value))
    );
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByIdWithSecrets(id: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('u')
      .addSelect(['u.password_hash', 'u.refresh_token_hash'])
      .where('u.id = :id', { id })
      .getOne();
  }

  /** Public/Citizen self-registration via phone — auto-created on first OTP verify. */
  async findOrCreateByPhone(phone: string): Promise<User> {
    const existing = await this.findByPhone(phone);
    if (existing) return existing;
    const created = this.users.create({
      name: phone,
      phone,
      role: Role.PUBLIC_CITIZEN,
      status: UserStatus.ACTIVE,
    });
    return this.users.save(created);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.users.update({ id }, { last_login_at: new Date() });
  }

  async setRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.users.update({ id }, { refresh_token_hash: hash });
  }

  async setPasswordHash(id: string, hash: string): Promise<void> {
    await this.users.increment({ id }, 'token_version', 1);
    await this.users.update({ id }, { password_hash: hash });
  }

  // ──────────────────────────── ADMIN: USER MANAGEMENT ─────────────────────

  /** Newest first — admin-facing listing, excludes password/refresh-token hashes by default. */
  findAllForAdmin(): Promise<User[]> {
    return this.users.find({ order: { created_at: 'DESC' } });
  }

  /** Admin dashboard — user counts by role and by status. */
  async getStats(): Promise<{ total: number; byRole: Record<Role, number>; byStatus: Record<UserStatus, number> }> {
    const [roleRows, statusRows, total] = await Promise.all([
      this.users.createQueryBuilder('u').select('u.role', 'role').addSelect('COUNT(*)', 'count').groupBy('u.role').getRawMany<{ role: Role; count: string }>(),
      this.users.createQueryBuilder('u').select('u.status', 'status').addSelect('COUNT(*)', 'count').groupBy('u.status').getRawMany<{ status: UserStatus; count: string }>(),
      this.users.count(),
    ]);

    const byRole = Object.fromEntries(Object.values(Role).map((r) => [r, 0])) as Record<Role, number>;
    for (const row of roleRows) byRole[row.role] = Number(row.count);

    const byStatus = Object.fromEntries(Object.values(UserStatus).map((s) => [s, 0])) as Record<UserStatus, number>;
    for (const row of statusRows) byStatus[row.status] = Number(row.count);

    return { total, byRole, byStatus };
  }

  async createByAdmin(dto: CreateUserDto): Promise<User> {
    if (!dto.email && !dto.phone && !dto.username) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Provide at least an email, phone number, or username',
        details: { email: ['Email, phone, or username is required'] },
      });
    }
    if (dto.email && (await this.findByEmail(dto.email))) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'A user with this email already exists' });
    }
    if (dto.phone && (await this.findByPhone(dto.phone))) {
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'A user with this phone number already exists' });
    }
    if (dto.username && (await this.findByUsername(dto.username))) {
      throw new ConflictException({ code: 'USERNAME_TAKEN', message: 'This username is already taken' });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.users.create({
      name: dto.name,
      email: dto.email?.toLowerCase().trim() ?? null,
      phone: dto.phone ?? null,
      username: dto.username ?? null,
      password_hash: passwordHash,
      role: dto.role,
      region: dto.region ?? null,
      status: dto.status ?? UserStatus.ACTIVE,
      permissions: dto.permissions ?? [],
    });
    const saved = await this.users.save(user);
    // `save()` returns the exact entity passed in — including password_hash, which
    // `select: false` does NOT strip from it (that option only affects find/findOne
    // queries). Re-fetch so the response never carries the hash back to the client.
    return this.findById(saved.id) as Promise<User>;
  }

  async updateByAdmin(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    if (dto.email && dto.email.toLowerCase().trim() !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'A user with this email already exists' });
      }
    }
    if (dto.phone && dto.phone !== user.phone) {
      const existing = await this.findByPhone(dto.phone);
      if (existing && existing.id !== id) {
        throw new ConflictException({ code: 'PHONE_TAKEN', message: 'A user with this phone number already exists' });
      }
    }
    if (dto.username && dto.username !== user.username) {
      const existing = await this.findByUsername(dto.username);
      if (existing && existing.id !== id) {
        throw new ConflictException({ code: 'USERNAME_TAKEN', message: 'This username is already taken' });
      }
    }

    Object.assign(user, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email.toLowerCase().trim() }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.username !== undefined && { username: dto.username }),
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.region !== undefined && { region: dto.region }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.permissions !== undefined && { permissions: dto.permissions }),
    });
    await this.users.save(user);

    // A fresh password invalidates existing sessions, same as the self-service reset flow.
    if (dto.newPassword) {
      const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
      await this.setPasswordHash(id, passwordHash);
    }

    return this.findById(id) as Promise<User>;
  }

  /** Sets a specific password if the admin supplied one, otherwise generates a
   *  random temporary one — either way, the plaintext is returned once so the
   *  admin can hand it to the user (e.g. via WhatsApp); it is never stored. */
  async resetPasswordByAdmin(id: string, customPassword?: string): Promise<string> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    const password = customPassword ?? generateTempPassword();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.setPasswordHash(id, passwordHash);
    return password;
  }
}
