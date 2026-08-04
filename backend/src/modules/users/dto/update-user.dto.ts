import { IsArray, IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Role, UserStatus } from '../../../common/enums/role.enum';
import { Permission } from '../../../common/enums/permission.enum';

const PHONE_REGEX = /^\d{10}$/;
/** Allows plain usernames as well as an email-shaped one (e.g. reusing their email as the username). */
const USERNAME_REGEX = /^[a-zA-Z0-9_.@+-]+$/;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'Phone must be a 10-digit number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(USERNAME_REGEX, { message: 'Username can only contain letters, numbers, and . _ @ + -' })
  username?: string;

  /** Admin-initiated password reset — leave unset to keep the current password. */
  @IsOptional()
  @MinLength(8)
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
