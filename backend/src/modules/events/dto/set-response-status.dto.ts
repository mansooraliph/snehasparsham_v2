import { IsOptional, IsString } from 'class-validator';

export class SetResponseStatusDto {
  @IsOptional()
  @IsString()
  statusId?: string | null;
}
