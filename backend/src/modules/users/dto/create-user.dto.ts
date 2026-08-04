import { IsArray, IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Role, UserStatus } from '../../../common/enums/role.enum';
import { Permission } from '../../../common/enums/permission.enum';

const PHONE_REGEX = /^\d{10}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'Phone must be a 10-digit number' })
  phone?: string;

  /** Login identifier — usable alongside email/phone (login-module.md open item on
   *  self-service accounts without either). Letters, numbers, "_" and "." only. */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(USERNAME_REGEX, { message: 'Username can only contain letters, numbers, "_" and "."' })
  username?: string;

  @MinLength(8)
  password: string;

  @IsEnum(Role)
  role: Role;

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
