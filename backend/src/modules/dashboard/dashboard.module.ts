import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [EventsModule, UsersModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
