import { Matches } from 'class-validator';

/** E.164 format — country code required (login-module.md §6 validation rules). */
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export class SendOtpDto {
  @Matches(PHONE_REGEX, { message: 'Phone must be in international format, e.g. +919876543210' })
  phone: string;
}
