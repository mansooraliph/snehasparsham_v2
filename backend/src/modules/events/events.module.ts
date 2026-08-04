import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../../database/entities/event.entity';
import { EventFormField } from '../../database/entities/event-form-field.entity';
import { EventResponse } from '../../database/entities/event-response.entity';
import { EventResponseValue } from '../../database/entities/event-response-value.entity';
import { ResponseStatus } from '../../database/entities/response-status.entity';
import { User } from '../../database/entities/user.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventFieldsController } from './event-fields.controller';
import { EventFieldsService } from './event-fields.service';
import { EventResponsesController } from './event-responses.controller';
import { EventResponsesService } from './event-responses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventFormField, EventResponse, EventResponseValue, ResponseStatus, User]),
  ],
  controllers: [EventsController, EventFieldsController, EventResponsesController],
  providers: [EventsService, EventFieldsService, EventResponsesService],
  exports: [EventsService, EventFieldsService, EventResponsesService],
})
export class EventsModule {}
