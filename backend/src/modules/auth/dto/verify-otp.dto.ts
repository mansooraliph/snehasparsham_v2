import { Matches } from 'class-validator';

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const OTP_REGEX = /^\d{6}$/;

export class VerifyOtpDto {
  @Matches(PHONE_REGEX, { message: 'Phone must be in international format, e.g. +919876543210' })
  phone: string;

  @Matches(OTP_REGEX, { message: 'OTP must be a 6-digit code' })
  code: string;
}
