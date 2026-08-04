import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { EventResponse } from '../../database/entities/event-response.entity';
import { EventResponseValue } from '../../database/entities/event-response-value.entity';
import { EventFormField } from '../../database/entities/event-form-field.entity';
import { ResponseStatus } from '../../database/entities/response-status.entity';
import { User } from '../../database/entities/user.entity';
import { EventFieldType } from '../../common/enums/event-field-type.enum';
import { EventsService } from './events.service';
import { EventFieldsService } from './event-fields.service';
import { EventFieldValue, SubmitEventResponseDto } from './dto/submit-event-response.dto';

export interface AdminResponseRow {
  id: string;
  referenceNumber: string;
  submittedAt: Date;
  values: Record<string, EventFieldValue>;
  status: { id: string; name: string; tone: string } | null;
  assignee: { id: string; name: string } | null;
}

/** 10-digit numeric code, e.g. "4839201576" — ~9 billion combinations. */
function randomReferenceCode(): string {
  return randomInt(1_000_000_000, 10_000_000_000).toString();
}

@Injectable()
export class EventResponsesService {
  private readonly logger = new Logger(EventResponsesService.name);

  constructor(
    @InjectRepository(EventResponse)
    private readonly responses: Repository<EventResponse>,
    @InjectRepository(EventResponseValue)
    private readonly values: Repository<EventResponseValue>,
    @InjectRepository(ResponseStatus)
    private readonly statuses: Repository<ResponseStatus>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly eventsService: EventsService,
    private readonly fieldsService: EventFieldsService,
  ) {}

  countForEvent(eventId: string): Promise<number> {
    return this.responses.count({ where: { event_id: eventId } });
  }

  /** Admin dashboard — total registrations across every event. */
  countAll(): Promise<number> {
    return this.responses.count();
  }

  /** Public submission (events-registration-module.md §3.4) — no login, no duplicate check. */
  async submit(eventId: string, dto: SubmitEventResponseDto): Promise<{ id: string; referenceNumber: string }> {
    // 404s on anything not Published — same guard the public detail page uses.
    const event = await this.eventsService.findPublishedOne(eventId);

    if (event.registration_deadline && event.registration_deadline < todayIso()) {
      throw new BadRequestException({
        code: 'REGISTRATION_CLOSED',
        message: 'The registration deadline for this event has passed.',
      });
    }

    if (event.max_participants !== null) {
      const count = await this.countForEvent(eventId);
      if (count >= event.max_participants) {
        throw new BadRequestException({ code: 'EVENT_FULL', message: 'This event has reached its participant limit.' });
      }
    }

    const fields = await this.fieldsService.findAllForEvent(eventId);
    this.assertRequiredFieldsPresent(fields, dto.values);

    const responseId = uuidv4();
    const referenceNumber =
      (await this.eventsService.claimNextReferenceNumber(eventId)) ?? (await this.generateReferenceNumber());
    await this.dataSource.transaction(async (manager) => {
      await manager.save(EventResponse, {
        id: responseId,
        event_id: eventId,
        submitted_by: null,
        reference_number: referenceNumber,
      });

      const rows = fields
        .filter((field) => dto.values[field.id] !== undefined)
        .map((field) =>
          manager.create(EventResponseValue, {
            id: uuidv4(),
            response_id: responseId,
            field_id: field.id,
            value: JSON.stringify(dto.values[field.id]),
          }),
        );
      if (rows.length) await manager.save(EventResponseValue, rows);
    });

    this.logConfirmation(event.name, fields, dto.values, referenceNumber);
    return { id: responseId, referenceNumber };
  }

  /** Admin edit — overwrites values for an existing response (events-registration-module.md scope: admin data correction). */
  async update(eventId: string, responseId: string, dto: SubmitEventResponseDto): Promise<AdminResponseRow> {
    const response = await this.findResponseOrThrow(eventId, responseId);

    const fields = await this.fieldsService.findAllForEvent(eventId);
    this.assertRequiredFieldsPresent(fields, dto.values);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(EventResponseValue, { response_id: responseId });

      const rows = fields
        .filter((field) => dto.values[field.id] !== undefined)
        .map((field) =>
          manager.create(EventResponseValue, {
            id: uuidv4(),
            response_id: responseId,
            field_id: field.id,
            value: JSON.stringify(dto.values[field.id]),
          }),
        );
      if (rows.length) await manager.save(EventResponseValue, rows);
    });

    return this.toRow(response, dto.values);
  }

  async remove(eventId: string, responseId: string): Promise<void> {
    await this.findResponseOrThrow(eventId, responseId);
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(EventResponseValue, { response_id: responseId });
      await manager.delete(EventResponse, { id: responseId });
    });
  }

  /** Deletes every response id that actually belongs to this event; silently
   *  ignores ids that don't (already gone, or from a different event). */
  async bulkRemove(eventId: string, responseIds: string[]): Promise<{ deleted: number }> {
    const owned = await this.responses.find({
      where: { id: In(responseIds), event_id: eventId },
      select: { id: true },
    });
    if (owned.length === 0) return { deleted: 0 };
    const ids = owned.map((r) => r.id);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(EventResponseValue, { response_id: In(ids) });
      await manager.delete(EventResponse, { id: In(ids) });
    });
    return { deleted: ids.length };
  }

  async setStatus(eventId: string, responseId: string, statusId: string | null): Promise<AdminResponseRow> {
    const response = await this.findResponseOrThrow(eventId, responseId);
    if (statusId) {
      const status = await this.statuses.findOne({ where: { id: statusId } });
      if (!status) throw new NotFoundException({ code: 'STATUS_NOT_FOUND', message: 'Response status not found' });
    }
    response.status_id = statusId;
    await this.responses.save(response);
    return this.toRow(response, await this.currentValues(responseId));
  }

  async setAssignee(eventId: string, responseId: string, userId: string | null): Promise<AdminResponseRow> {
    const response = await this.findResponseOrThrow(eventId, responseId);
    if (userId) {
      const user = await this.users.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    response.assigned_to = userId;
    await this.responses.save(response);
    return this.toRow(response, await this.currentValues(responseId));
  }

  /** Admin listing — every response for the event, values keyed by field id. */
  async findAllForEvent(eventId: string): Promise<{ fields: EventFormField[]; responses: AdminResponseRow[] }> {
    const fields = await this.fieldsService.findAllForEvent(eventId);
    const responses = await this.responses.find({ where: { event_id: eventId }, order: { submitted_at: 'DESC' } });
    if (responses.length === 0) return { fields, responses: [] };

    const allValues = await this.values.find({
      where: { response_id: In(responses.map((r) => r.id)) },
    });
    const byResponse = new Map<string, EventResponseValue[]>();
    for (const v of allValues) {
      const list = byResponse.get(v.response_id) ?? [];
      list.push(v);
      byResponse.set(v.response_id, list);
    }

    const [statusMap, userMap] = await this.lookupMaps(responses);

    return {
      fields,
      responses: responses.map((r) => ({
        id: r.id,
        referenceNumber: r.reference_number,
        submittedAt: r.submitted_at,
        values: Object.fromEntries(
          (byResponse.get(r.id) ?? []).map((v) => [v.field_id, safeParse(v.value)]),
        ),
        status: r.status_id ? statusMap.get(r.status_id) ?? null : null,
        assignee: r.assigned_to ? userMap.get(r.assigned_to) ?? null : null,
      })),
    };
  }

  async exportCsv(eventId: string): Promise<string> {
    const { fields, responses } = await this.findAllForEvent(eventId);
    const header = ['Reference Number', ...fields.map((f) => f.label), 'Status', 'Assigned To', 'Submitted At'];
    const rows = responses.map((r) => [
      r.referenceNumber,
      ...fields.map((f) => formatCell(r.values[f.id])),
      r.status?.name ?? '',
      r.assignee?.name ?? '',
      r.submittedAt.toISOString(),
    ]);
    return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  }

  /** Retries on the rare collision — 8 chars from a 33-char set is ~1.7e12 combinations. */
  private async generateReferenceNumber(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = randomReferenceCode();
      const exists = await this.responses.exists({ where: { reference_number: candidate } });
      if (!exists) return candidate;
    }
    throw new Error('Could not generate a unique reference number.');
  }

  private async findResponseOrThrow(eventId: string, responseId: string): Promise<EventResponse> {
    const response = await this.responses.findOne({ where: { id: responseId, event_id: eventId } });
    if (!response) {
      throw new BadRequestException({ code: 'NOT_FOUND', message: 'Response not found.' });
    }
    return response;
  }

  private async currentValues(responseId: string): Promise<Record<string, EventFieldValue>> {
    const rows = await this.values.find({ where: { response_id: responseId } });
    return Object.fromEntries(rows.map((v) => [v.field_id, safeParse(v.value)]));
  }

  private async toRow(response: EventResponse, values: Record<string, EventFieldValue>): Promise<AdminResponseRow> {
    const [statusMap, userMap] = await this.lookupMaps([response]);
    return {
      id: response.id,
      referenceNumber: response.reference_number,
      submittedAt: response.submitted_at,
      values,
      status: response.status_id ? statusMap.get(response.status_id) ?? null : null,
      assignee: response.assigned_to ? userMap.get(response.assigned_to) ?? null : null,
    };
  }

  private async lookupMaps(
    responses: EventResponse[],
  ): Promise<[Map<string, { id: string; name: string; tone: string }>, Map<string, { id: string; name: string }>]> {
    const statusIds = [...new Set(responses.map((r) => r.status_id).filter((id): id is string => !!id))];
    const userIds = [...new Set(responses.map((r) => r.assigned_to).filter((id): id is string => !!id))];

    const [statusRows, userRows] = await Promise.all([
      statusIds.length ? this.statuses.find({ where: { id: In(statusIds) } }) : Promise.resolve([]),
      userIds.length ? this.users.find({ where: { id: In(userIds) } }) : Promise.resolve([]),
    ]);

    return [
      new Map(statusRows.map((s) => [s.id, { id: s.id, name: s.name, tone: s.tone }])),
      new Map(userRows.map((u) => [u.id, { id: u.id, name: u.name }])),
    ];
  }

  private assertRequiredFieldsPresent(fields: EventFormField[], values: Record<string, EventFieldValue>): void {
    const missing = fields.filter((field) => {
      if (!field.is_required) return false;
      const v = values[field.id];
      if (v === undefined || v === null) return true;
      if (Array.isArray(v)) return v.length === 0;
      if (field.field_type === EventFieldType.ITEM_LIST) {
        const entries = v as Record<string, string>;
        return (field.options ?? []).some((item) => !entries[item]?.trim());
      }
      return (v as string).trim() === '';
    });
    if (missing.length) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Please fill in all required fields.',
        details: Object.fromEntries(missing.map((f) => [f.id, [`${f.label} is required`]])),
      });
    }
  }

  /** No email/SMS provider wired up yet (CLAUDE.md open item) — logging stands in for it. */
  private logConfirmation(
    eventName: string,
    fields: EventFormField[],
    values: Record<string, EventFieldValue>,
    referenceNumber: string,
  ): void {
    const contactField = fields.find((f) => f.field_type === 'email' || /email|phone|mobile/i.test(f.label));
    const contact = contactField ? values[contactField.id] : undefined;
    this.logger.log(
      `Registration confirmation for "${eventName}"${contact ? ` → ${contact}` : ''}: submission received (ref ${referenceNumber}).`,
    );
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeParse(raw: string): EventFieldValue {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function formatCell(value: EventFieldValue | undefined): string {
  if (value === undefined) return '';
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([item, v]) => `${item}: ${v}`)
      .join('; ');
  }
  return value;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
