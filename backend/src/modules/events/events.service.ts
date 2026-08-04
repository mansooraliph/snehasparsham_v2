import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual, Repository } from 'typeorm';
import { Event } from '../../database/entities/event.entity';
import { EventFormField } from '../../database/entities/event-form-field.entity';
import { EventResponse } from '../../database/entities/event-response.entity';
import { EventResponseValue } from '../../database/entities/event-response-value.entity';
import { EventStatus } from '../../common/enums/event-status.enum';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
      message_template: dto.messageTemplate ?? null,
      reference_prefix: dto.referencePrefix?.trim() || null,
      reference_next_number: dto.referenceNextNumber ?? 1,
      reference_padding: dto.referencePadding ?? 4,
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
      ...(dto.messageTemplate !== undefined && { message_template: dto.messageTemplate }),
      ...(dto.referencePrefix !== undefined && { reference_prefix: dto.referencePrefix.trim() || null }),
      ...(dto.referenceNextNumber !== undefined && { reference_next_number: dto.referenceNextNumber }),
      ...(dto.referencePadding !== undefined && { reference_padding: dto.referencePadding }),
    });
    return this.events.save(event);
  }

  /** Cascades manually — these entities use plain string FK columns, not TypeORM
   *  relations, so the DB has no ON DELETE CASCADE to lean on. */
  async remove(id: string, requesterId: string): Promise<void> {
    const event = await this.findOne(id);
    this.assertOwnerOrElevated(event, requesterId);

    await this.dataSource.transaction(async (manager) => {
      const responseIds = (await manager.find(EventResponse, { where: { event_id: id }, select: { id: true } })).map(
        (r) => r.id,
      );
      if (responseIds.length) {
        await manager.delete(EventResponseValue, { response_id: In(responseIds) });
        await manager.delete(EventResponse, { id: In(responseIds) });
      }
      await manager.delete(EventFormField, { event_id: id });
      await manager.delete(Event, { id });
    });
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
      message_template: source.message_template,
      reference_prefix: source.reference_prefix,
      reference_next_number: 1,
      reference_padding: source.reference_padding,
      created_by: requesterId,
    });
    return this.events.save(copy);
  }

  /** Atomically claims the next reference number in this event's series and returns it
   *  formatted (e.g. "REG-2026-0001"). Falls back to caller-supplied random generation
   *  when the event has no configured prefix. */
  async claimNextReferenceNumber(eventId: string): Promise<string | null> {
    const event = await this.findOne(eventId);
    if (!event.reference_prefix) return null;

    const result = await this.events
      .createQueryBuilder()
      .update(Event)
      .set({ reference_next_number: () => 'reference_next_number + 1' })
      .where('id = :id', { id: eventId })
      .returning(['reference_next_number'])
      .execute();

    const newNext = Number(result.raw[0].reference_next_number);
    const assigned = newNext - 1;
    return `${event.reference_prefix}${String(assigned).padStart(event.reference_padding, '0')}`;
  }

  /** Admin dashboard — event counts by status plus how many published events are still upcoming. */
  async getStats(): Promise<{ total: number; byStatus: Record<EventStatus, number>; upcoming: number }> {
    const rows = await this.events
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.status')
      .getRawMany<{ status: EventStatus; count: string }>();

    const byStatus = Object.fromEntries(Object.values(EventStatus).map((s) => [s, 0])) as Record<
      EventStatus,
      number
    >;
    let total = 0;
    for (const row of rows) {
      byStatus[row.status] = Number(row.count);
      total += Number(row.count);
    }

    const upcoming = await this.events.count({
      where: { status: EventStatus.PUBLISHED, start_date: MoreThanOrEqual(todayIso()) },
    });

    return { total, byStatus, upcoming };
  }

  private assertOwnerOrElevated(_event: Event, _requesterId: string): void {
    // Region-scoped ownership checks are an open item (CLAUDE.md — District/State
    // Admin scoping). Every admin role can manage every event until that's decided.
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
