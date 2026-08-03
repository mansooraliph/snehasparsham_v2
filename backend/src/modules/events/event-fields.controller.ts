import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsArray, IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { EventFieldsService } from './event-fields.service';
import { CreateEventFieldDto } from './dto/create-event-field.dto';
import { UpdateEventFieldDto } from './dto/update-event-field.dto';

const EVENT_ADMIN_ROLES = [Role.SUPER_ADMIN, Role.DISTRICT_STATE_ADMIN];

class ReorderFieldsDto {
  @IsArray()
  @IsString({ each: true })
  orderedFieldIds: string[];
}

@Roles(...EVENT_ADMIN_ROLES)
@RequirePermissions(Permission.MANAGE_EVENTS)
@Controller('events/:eventId/fields')
export class EventFieldsController {
  constructor(private readonly fields: EventFieldsService) {}

  @Get()
  findAll(@Param('eventId') eventId: string) {
    return this.fields.findAllForEvent(eventId);
  }

  @Post()
  create(@Param('eventId') eventId: string, @Body() dto: CreateEventFieldDto) {
    return this.fields.create(eventId, dto);
  }

  @Put('reorder')
  reorder(@Param('eventId') eventId: string, @Body() dto: ReorderFieldsDto) {
    return this.fields.reorder(eventId, dto.orderedFieldIds);
  }

  @Put(':fieldId')
  update(@Param('eventId') eventId: string, @Param('fieldId') fieldId: string, @Body() dto: UpdateEventFieldDto) {
    return this.fields.update(eventId, fieldId, dto);
  }

  @Delete(':fieldId')
  remove(@Param('eventId') eventId: string, @Param('fieldId') fieldId: string) {
    return this.fields.remove(eventId, fieldId);
  }
}
