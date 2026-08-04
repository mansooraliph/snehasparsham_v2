import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import type { ResponseStatusTone } from '../../../database/entities/response-status.entity';

const TONES: ResponseStatusTone[] = ['neutral', 'blue', 'green', 'amber', 'red'];

export class CreateResponseStatusDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsIn(TONES)
  tone?: ResponseStatusTone;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
