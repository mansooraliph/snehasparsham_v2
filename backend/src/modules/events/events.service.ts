import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../database/entities/event.entity';
import { EventStatus } from '../../common/enums/event-status.enum';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
  ) {}

  create(dto: CreateEventDto, createdBy: string): Promise<Event> {
    const event = this.events.create({
      name: dto.name,
      poster_url: dto.posterUrl ?? null,
      description: dto.description ?? null,
      location: dto.location,
      start_date: dto.startDate,
      end_date: dto.endDate,
      start_time: dto.startTime ?? null,
      end_time: dto.endTime ?? null,
      status: dto.status ?? EventStatus.DRAFT,
      registration_deadline: dto.registrationDeadline ?? null,
      max_participants: dto.maxParticipants ?? null,
      created_by: createdBy,
    });
    return this.events.save(event);
  }

  /** Admin listing — every event regardless of status, newest first. */
  findAll(): Promise<Event[]> {
    return this.events.find({ order: { created_at: 'DESC' } });
  }

  /** Public listing — published events only (events-registration-module.md §3.3). */
  findPublished(): Promise<Event[]> {
    return this.events.find({
      where: { status: EventStatus.PUBLISHED },
      order: { start_date: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.events.findOne({ where: { id } });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found' });
    return event;
  }

  /** Public detail — 404s on anything not Published, same as a guest hitting a dead link. */
  async findPublishedOne(id: string): Promise<Event> {
    const event = await this.events.findOne({ where: { id, status: EventStatus.PUBLISHED } });
    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found' });
    return event;
  }

  async update(id: string, dto: UpdateEventDto, requesterId: string): Promise<Event> {
    const event = await this.findOne(id);
    this.assertOwnerOrElevated(event, requesterId);

    Object.assign(event, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.posterUrl !== undefined && { poster_url: dto.posterUrl }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.startDate !== undefined && { start_date: dto.startDate }),
      ...(dto.endDate !== undefined && { end_date: dto.endDate }),
      ...(dto.startTime !== undefined && { start_time: dto.startTime }),
      ...(dto.endTime !== undefined && { end_time: dto.endTime }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.registrationDeadline !== undefined && { registration_deadline: dto.registrationDeadline }),
      ...(dto.maxParticipants !== undefined && { max_participants: dto.maxParticipants }),
    });
    return this.events.save(event);
  }

  async remove(id: string, requesterId: string): Promise<void> {
    const event = await this.findOne(id);
    this.assertOwnerOrElevated(event, requesterId);
    await this.events.remove(event);
  }

  /** Clone an event (events-registration-module.md §3.5) — form structure carries
   *  over automatically once the form-builder tables exist; for now it copies
   *  the event fields only, always landing in Draft. */
  async clone(id: string, requesterId: string): Promise<Event> {
    const source = await this.findOne(id);
    const copy = this.events.create({
      name: `${source.name} (Copy)`,
      poster_url: source.poster_url,
      description: source.description,
      location: source.location,
      start_date: source.start_date,
      end_date: source.end_date,
      start_time: source.start_time,
      end_time: source.end_time,
      status: EventStatus.DRAFT,
      registration_deadline: source.registration_deadline,
      max_participants: source.max_participants,
      created_by: requesterId,
    });
    return this.events.save(copy);
  }

  private assertOwnerOrElevated(_event: Event, _requesterId: string): void {
    // Region-scoped ownership checks are an open item (CLAUDE.md — District/State
    // Admin scoping). Every admin role can manage every event until that's decided.
  }
}
