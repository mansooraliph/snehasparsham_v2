import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { EventFieldType, OPTIONS_REQUIRED_FIELD_TYPES } from '../../../common/enums/event-field-type.enum';

export class CreateEventFieldDto {
  @IsString()
  @MinLength(1)
  label: string;

  @IsEnum(EventFieldType)
  fieldType: EventFieldType;

  @ValidateIf((dto: CreateEventFieldDto) => OPTIONS_REQUIRED_FIELD_TYPES.includes(dto.fieldType))
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
