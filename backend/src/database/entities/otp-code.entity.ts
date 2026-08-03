import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Single-use, 5-minute-expiry OTP for phone login (login-module.md §6). */
@Entity('otp_codes')
export class OtpCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  phone: string;

  @Column({ select: false })
  code_hash: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  consumed_at: Date | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
