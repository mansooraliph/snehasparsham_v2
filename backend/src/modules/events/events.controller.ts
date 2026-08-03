import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { EventsService } from './events.service';
import { EventFieldsService } from './event-fields.service';
import { EventResponsesService } from './event-responses.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

/** events-registration-module.md §2 — only Admin roles can create/manage events. */
const EVENT_ADMIN_ROLES = [Role.SUPER_ADMIN, Role.DISTRICT_STATE_ADMIN];

@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly fields: EventFieldsService,
    private readonly responses: EventResponsesService,
  ) {}

  // Public routes are declared first so their literal 'public' segment isn't
  // swallowed by the admin ':id' route below (Nest matches in declaration order).
  @Public()
  @Get('public')
  findPublished() {
    return this.events.findPublished();
  }

  /** Includes responseCount so the UI can disable submission once seats are full. */
  @Public()
  @Get('public/:id')
  async findPublishedOne(@Param('id') id: string) {
    const event = await this.events.findPublishedOne(id);
    const responseCount = await this.responses.countForEvent(id);
    return { ...event, responseCount };
  }

  /** Form structure for the public registration form (events-registration-module.md §3.4). */
  @Public()
  @Get('public/:id/fields')
  async findPublishedFields(@Param('id') id: string) {
    await this.events.findPublishedOne(id);
    return this.fields.findAllForEvent(id);
  }

  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_EVENTS)
  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthUser) {
    return this.events.create(dto, user.userId);
  }

  /** Admin listing — every event regardless of status (events-registration-module.md §3.5). */
  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_EVENTS)
  @Get()
  findAll() {
    return this.events.findAll();
  }

  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_EVENTS)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.events.findOne(id);
  }

  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_EVENTS)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() user: AuthUser) {
    return this.events.update(id, dto, user.userId);
  }

  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_EVENTS)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.events.remove(id, user.userId);
  }

  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_EVENTS)
  @Post(':id/clone')
  clone(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.events.clone(id, user.userId);
  }
}
