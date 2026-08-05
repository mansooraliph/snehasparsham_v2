import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { EventFieldType, OPTIONS_REQUIRED_FIELD_TYPES } from '../../../common/enums/event-field-type.enum';
import { ItemSerialConfigInput } from '../../../common/types/item-serial-config';

class ItemSerialConfigInputDto implements ItemSerialConfigInput {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  start?: number;
}

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

  /** item_list only — per-item auto serial number config, aligned by index with `options`. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemSerialConfigInputDto)
  itemSerialConfig?: ItemSerialConfigInputDto[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
