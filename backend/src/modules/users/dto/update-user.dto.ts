import { IsArray, IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Role, UserStatus } from '../../../common/enums/role.enum';
import { Permission } from '../../../common/enums/permission.enum';

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const PASSWORD_REGEX = /^(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/;'`~]).+$/;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'Phone must be in international format, e.g. +919876543210' })
  phone?: string;

  /** Admin-initiated password reset — leave unset to keep the current password. */
  @IsOptional()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must contain at least 1 number and 1 special character',
  })
  newPassword?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions?: Permission[];
}
