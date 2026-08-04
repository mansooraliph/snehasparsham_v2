import { Matches } from 'class-validator';

const PHONE_REGEX = /^\d{10}$/;
const OTP_REGEX = /^\d{6}$/;

export class VerifyOtpDto {
  @Matches(PHONE_REGEX, { message: 'Phone must be a 10-digit number' })
  phone: string;

  @Matches(OTP_REGEX, { message: 'OTP must be a 6-digit code' })
  code: string;
}
