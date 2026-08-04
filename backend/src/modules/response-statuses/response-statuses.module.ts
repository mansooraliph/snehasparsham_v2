import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponseStatus } from '../../database/entities/response-status.entity';
import { EventResponse } from '../../database/entities/event-response.entity';
import { ResponseStatusesController } from './response-statuses.controller';
import { ResponseStatusesService } from './response-statuses.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResponseStatus, EventResponse])],
  controllers: [ResponseStatusesController],
  providers: [ResponseStatusesService],
})
export class ResponseStatusesModule {}
