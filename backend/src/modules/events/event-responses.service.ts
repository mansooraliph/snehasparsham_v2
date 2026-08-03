import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EventResponse } from '../../database/entities/event-response.entity';
import { EventResponseValue } from '../../database/entities/event-response-value.entity';
import { EventFormField } from '../../database/entities/event-form-field.entity';
import { EventFieldType } from '../../common/enums/event-field-type.enum';
import { EventsService } from './events.service';
import { EventFieldsService } from './event-fields.service';
import { EventFieldValue, SubmitEventResponseDto } from './dto/submit-event-response.dto';

export interface AdminResponseRow {
  id: string;
  submittedAt: Date;
  values: Record<string, EventFieldValue>;
}

@Injectable()
export class EventResponsesService {
  private readonly logger = new Logger(EventResponsesService.name);

  constructor(
    @InjectRepository(EventResponse)
    private readonly responses: Repository<EventResponse>,
    @InjectRepository(EventResponseValue)
    private readonly values: Repository<EventResponseValue>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly eventsService: EventsService,
    private readonly fieldsService: EventFieldsService,
  ) {}

  countForEvent(eventId: string): Promise<number> {
    return this.responses.count({ where: { event_id: eventId } });
  }

  /** Public submission (events-registration-module.md §3.4) — no login, no duplicate check. */
  async submit(eventId: string, dto: SubmitEventResponseDto): Promise<{ id: string }> {
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
    await this.dataSource.transaction(async (manager) => {
      await manager.save(EventResponse, {
        id: responseId,
        event_id: eventId,
        submitted_by: null,
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

    this.logConfirmation(event.name, fields, dto.values);
    return { id: responseId };
  }

  /** Admin edit — overwrites values for an existing response (events-registration-module.md scope: admin data correction). */
  async update(eventId: string, responseId: string, dto: SubmitEventResponseDto): Promise<AdminResponseRow> {
    const response = await this.responses.findOne({ where: { id: responseId, event_id: eventId } });
    if (!response) {
      throw new BadRequestException({ code: 'NOT_FOUND', message: 'Response not found.' });
    }

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

    return { id: responseId, submittedAt: response.submitted_at, values: dto.values };
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

    return {
      fields,
      responses: responses.map((r) => ({
        id: r.id,
        submittedAt: r.submitted_at,
        values: Object.fromEntries(
          (byResponse.get(r.id) ?? []).map((v) => [v.field_id, safeParse(v.value)]),
        ),
      })),
    };
  }

  async exportCsv(eventId: string): Promise<string> {
    const { fields, responses } = await this.findAllForEvent(eventId);
    const header = [...fields.map((f) => f.label), 'Submitted At'];
    const rows = responses.map((r) => [
      ...fields.map((f) => formatCell(r.values[f.id])),
      r.submittedAt.toISOString(),
    ]);
    return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
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
  ): void {
    const contactField = fields.find((f) => f.field_type === 'email' || /email|phone|mobile/i.test(f.label));
    const contact = contactField ? values[contactField.id] : undefined;
    this.logger.log(
      `Registration confirmation for "${eventName}"${contact ? ` → ${contact}` : ''}: submission received.`,
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
