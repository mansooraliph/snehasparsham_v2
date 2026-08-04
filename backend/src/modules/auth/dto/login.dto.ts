import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Email, phone, OR username — resolved in that order (see UsersService.findByIdentifier). */
  @IsString()
  @MinLength(1)
  identifier: string;

  @IsString()
  @MinLength(8)
  password: string;
}
