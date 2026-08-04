import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { EventResponsesService } from './event-responses.service';
import { SubmitEventResponseDto } from './dto/submit-event-response.dto';
import { SetResponseStatusDto } from './dto/set-response-status.dto';
import { AssignResponseDto } from './dto/assign-response.dto';

const EVENT_ADMIN_ROLES = [Role.SUPER_ADMIN, Role.DISTRICT_STATE_ADMIN];

@Controller('events/:eventId/responses')
export class EventResponsesController {
  constructor(private readonly responses: EventResponsesService) {}

  @Public()
  @Post()
  submit(@Param('eventId') eventId: string, @Body() dto: SubmitEventResponseDto) {
    return this.responses.submit(eventId, dto);
  }

  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_RESPONSES)
  @Get()
  findAll(@Param('eventId') eventId: string) {
    return this.responses.findAllForEvent(eventId);
  }

  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_RESPONSES)
  @Patch(':responseId')
  update(
    @Param('eventId') eventId: string,
    @Param('responseId') responseId: string,
    @Body() dto: SubmitEventResponseDto,
  ) {
    return this.responses.update(eventId, responseId, dto);
  }

  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_RESPONSES)
  @Patch(':responseId/status')
  setStatus(
    @Param('eventId') eventId: string,
    @Param('responseId') responseId: string,
    @Body() dto: SetResponseStatusDto,
  ) {
    return this.responses.setStatus(eventId, responseId, dto.statusId ?? null);
  }

  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_RESPONSES)
  @Patch(':responseId/assign')
  assign(
    @Param('eventId') eventId: string,
    @Param('responseId') responseId: string,
    @Body() dto: AssignResponseDto,
  ) {
    return this.responses.setAssignee(eventId, responseId, dto.userId ?? null);
  }

  @Roles(...EVENT_ADMIN_ROLES)
  @RequirePermissions(Permission.MANAGE_RESPONSES)
  @Get('export')
  async export(@Param('eventId') eventId: string, @Res() res: Response) {
    const csv = await this.responses.exportCsv(eventId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-responses.csv"`);
    res.send(csv);
  }
}
