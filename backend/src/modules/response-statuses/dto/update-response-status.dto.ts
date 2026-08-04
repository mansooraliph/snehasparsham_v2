import { PartialType } from '@nestjs/mapped-types';
import { CreateResponseStatusDto } from './create-response-status.dto';

export class UpdateResponseStatusDto extends PartialType(CreateResponseStatusDto) {}
