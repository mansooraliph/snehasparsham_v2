import { IsOptional, MinLength } from 'class-validator';

export class ResetPasswordByAdminDto {
  /** Leave unset to auto-generate a random password instead. */
  @IsOptional()
  @MinLength(8)
  password?: string;
}
