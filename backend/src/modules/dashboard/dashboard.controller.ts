import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { EventsService } from '../events/events.service';
import { EventResponsesService } from '../events/event-responses.service';
import { UsersService } from '../users/users.service';

@Roles(Role.SUPER_ADMIN, Role.DISTRICT_STATE_ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly events: EventsService,
    private readonly responses: EventResponsesService,
    private readonly users: UsersService,
  ) {}

  @Get('stats')
  async stats() {
    const [eventStats, userStats, totalRegistrations] = await Promise.all([
      this.events.getStats(),
      this.users.getStats(),
      this.responses.countAll(),
    ]);

    return {
      events: eventStats,
      users: userStats,
      totalRegistrations,
    };
  }
}
