import { IsString, Matches, MinLength } from 'class-validator';

/** At least 1 number + 1 special character (login-module.md §6). */
const PASSWORD_REGEX = /^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/;'`~]).+$/;

export class ResetPasswordDto {
  @IsString()
  token: string;

  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must contain at least 1 number and 1 special character',
  })
  newPassword: string;
}
