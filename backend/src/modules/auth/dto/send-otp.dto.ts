import { Matches } from 'class-validator';

const PHONE_REGEX = /^\d{10}$/;

export class SendOtpDto {
  @Matches(PHONE_REGEX, { message: 'Phone must be a 10-digit number' })
  phone: string;
}
