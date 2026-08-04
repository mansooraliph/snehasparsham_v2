import { IsOptional, IsString } from 'class-validator';

export class AssignResponseDto {
  @IsOptional()
  @IsString()
  userId?: string | null;
}
