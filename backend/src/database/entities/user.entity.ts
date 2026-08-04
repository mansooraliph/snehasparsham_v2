import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role, UserStatus } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Index({ unique: true, where: '"phone" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  /** Login identifier for users without an email/phone-based flow — set by an
   *  admin at creation time. Login accepts email, phone, OR username. */
  @Index({ unique: true, where: '"username" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  /** Nullable so phone/OTP-only accounts never need a password. */
  @Column({ type: 'varchar', nullable: true, select: false })
  password_hash: string | null;

  @Column({ type: 'enum', enum: Role, default: Role.PUBLIC_CITIZEN })
  role: Role;

  /** Region scoping for District/State Admins. */
  @Column({ type: 'varchar', nullable: true })
  region: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  /** Grants beyond what `role` implies by default — see permission.enum.ts. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  permissions: Permission[];

  /** Bumped on password change/logout-everywhere to invalidate old refresh tokens. */
  @Column({ type: 'int', default: 1 })
  token_version: number;

  @Column({ type: 'varchar', nullable: true, select: false })
  refresh_token_hash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
