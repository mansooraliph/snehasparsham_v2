import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateEventFieldDto } from './create-event-field.dto';

export class UpdateEventFieldDto extends PartialType(CreateEventFieldDto) {
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
