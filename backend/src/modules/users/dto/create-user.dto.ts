import { IsArray, IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Role, UserStatus } from '../../../common/enums/role.enum';
import { Permission } from '../../../common/enums/permission.enum';

const PHONE_REGEX = /^\d{10}$/;

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
