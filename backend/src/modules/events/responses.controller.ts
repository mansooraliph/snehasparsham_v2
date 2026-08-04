import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { EventResponsesService } from './event-responses.service';

const EVENT_ADMIN_ROLES = [Role.SUPER_ADMIN, Role.DISTRICT_STATE_ADMIN];

/** Cross-event view of Event_Responses — the per-event CRUD/detail routes live
 *  on EventResponsesController; this is just the global filterable list. */
@Roles(...EVENT_ADMIN_ROLES)
@RequirePermissions(Permission.MANAGE_RESPONSES)
@Controller('responses')
export class ResponsesController {
  constructor(private readonly responses: EventResponsesService) {}

  @Get()
  findAll(
    @Query('eventId') eventId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.responses.findAllAcrossEvents({ eventId, assigneeId, dateFrom, dateTo });
  }
}
