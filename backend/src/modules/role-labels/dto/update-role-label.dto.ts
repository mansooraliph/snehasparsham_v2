import { IsString, MinLength } from 'class-validator';

export class UpdateRoleLabelDto {
  @IsString()
  @MinLength(1)
  label: string;
}
