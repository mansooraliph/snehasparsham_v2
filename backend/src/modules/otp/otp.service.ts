import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { OtpCode } from '../../database/entities/otp-code.entity';

const BCRYPT_ROUNDS = 10;
const MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpCode)
    private readonly otps: Repository<OtpCode>,
  ) {}

  /** Generates, stores (hashed), and "sends" a 6-digit OTP for a phone number. */
  async send(phone: string): Promise<void> {
    const length = Number(process.env.OTP_LENGTH ?? 6);
    const code = Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
    const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES ?? 5);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

    await this.otps.save(this.otps.create({ phone, code_hash: codeHash, expires_at: expiresAt }));

    // No SMS gateway wired up yet (Twilio choice is an open item in CLAUDE.md) —
    // logging the code lets phone/OTP login be exercised end-to-end in dev.
    this.logger.log(`OTP for ${phone}: ${code} (expires in ${expiryMinutes}m)`);
  }

  /** Verifies the most recent unexpired, unconsumed OTP for a phone number. */
  async verify(phone: string, code: string): Promise<void> {
    const invalid = () =>
      new UnauthorizedException({ code: 'INVALID_OTP', message: 'Invalid or expired OTP' });

    const otp = await this.otps.findOne({
      where: { phone, consumed_at: IsNull(), expires_at: MoreThan(new Date()) },
      order: { created_at: 'DESC' },
      select: { id: true, code_hash: true, attempts: true },
    });
    if (!otp) throw invalid();

    if (otp.attempts >= MAX_ATTEMPTS) {
      await this.otps.update({ id: otp.id }, { consumed_at: new Date() });
      throw invalid();
    }

    const matches = await bcrypt.compare(code, otp.code_hash);
    if (!matches) {
      await this.otps.increment({ id: otp.id }, 'attempts', 1);
      throw invalid();
    }

    await this.otps.update({ id: otp.id }, { consumed_at: new Date() });
  }
}
