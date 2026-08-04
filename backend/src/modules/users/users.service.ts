import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { Role, UserStatus } from '../../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 12;

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

  async createByAdmin(dto: CreateUserDto): Promise<User> {
    if (!dto.email && !dto.phone) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Provide at least an email or a phone number',
        details: { email: ['Email or phone is required'] },
      });
    }
    if (dto.email && (await this.findByEmail(dto.email))) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'A user with this email already exists' });
    }
    if (dto.phone && (await this.findByPhone(dto.phone))) {
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'A user with this phone number already exists' });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.users.create({
      name: dto.name,
      email: dto.email?.toLowerCase().trim() ?? null,
      phone: dto.phone ?? null,
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

    Object.assign(user, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email.toLowerCase().trim() }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
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
}
