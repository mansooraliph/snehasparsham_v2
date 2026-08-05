import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { Event } from '../../database/entities/event.entity';
import { EventResponse } from '../../database/entities/event-response.entity';
import { EventResponseValue } from '../../database/entities/event-response-value.entity';
import { EventFormField } from '../../database/entities/event-form-field.entity';
import { ResponseItem } from '../../database/entities/response-item.entity';
import { ResponseStatus } from '../../database/entities/response-status.entity';
import { User } from '../../database/entities/user.entity';
import { EventFieldType } from '../../common/enums/event-field-type.enum';
import { EventsService } from './events.service';
import { EventFieldsService } from './event-fields.service';
import { EventFieldValue, ItemListEntry, SubmitEventResponseDto } from './dto/submit-event-response.dto';

export interface ResponseItemRow {
  id: string;
  fieldId: string;
  fieldLabel: string;
  itemLabel: string;
  value: string;
  codes: string[];
  status: { id: string; name: string; tone: string } | null;
  assignee: { id: string; name: string } | null;
}

export interface AdminResponseRow {
  id: string;
  referenceNumber: string;
  submittedAt: Date;
  values: Record<string, EventFieldValue>;
  status: { id: string; name: string; tone: string } | null;
  assignee: { id: string; name: string } | null;
  items: ResponseItemRow[];
}

export interface CrossEventResponseRow {
  id: string;
  referenceNumber: string;
  submittedAt: Date;
  values: Record<string, EventFieldValue>;
  status: { id: string; name: string; tone: string } | null;
  assignee: { id: string; name: string } | null;
  event: { id: string; name: string };
  items: ResponseItemRow[];
}

export interface CrossEventResponseFilters {
  eventId?: string;
  assigneeId?: string;
  /** Inclusive, "YYYY-MM-DD". */
  dateFrom?: string;
  dateTo?: string;
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
    @InjectRepository(ResponseItem)
    private readonly items: Repository<ResponseItem>,
    @InjectRepository(EventFormField)
    private readonly formFields: Repository<EventFormField>,
    @InjectRepository(ResponseStatus)
    private readonly statuses: Repository<ResponseStatus>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
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
  async submit(
    eventId: string,
    dto: SubmitEventResponseDto,
  ): Promise<{ id: string; referenceNumber: string; values: Record<string, EventFieldValue> }> {
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
    let finalValues = dto.values;
    await this.dataSource.transaction(async (manager) => {
      finalValues = await this.assignItemSerialCodes(fields, dto.values, manager);

      await manager.save(EventResponse, {
        id: responseId,
        event_id: eventId,
        submitted_by: null,
        reference_number: referenceNumber,
      });

      const rows = fields
        .filter((field) => finalValues[field.id] !== undefined)
        .map((field) =>
          manager.create(EventResponseValue, {
            id: uuidv4(),
            response_id: responseId,
            field_id: field.id,
            value: JSON.stringify(finalValues[field.id]),
          }),
        );
      if (rows.length) await manager.save(EventResponseValue, rows);
      await this.syncResponseItems(responseId, fields, finalValues, manager);
    });

    this.logConfirmation(event.name, fields, finalValues, referenceNumber);
    return { id: responseId, referenceNumber, values: finalValues };
  }

  /** Admin edit — overwrites values for an existing response (events-registration-module.md scope: admin data correction). */
  async update(eventId: string, responseId: string, dto: SubmitEventResponseDto): Promise<AdminResponseRow> {
    const response = await this.findResponseOrThrow(eventId, responseId);

    const fields = await this.fieldsService.findAllForEvent(eventId);
    this.assertRequiredFieldsPresent(fields, dto.values);

    let finalValues = dto.values;
    await this.dataSource.transaction(async (manager) => {
      finalValues = await this.assignItemSerialCodes(fields, dto.values, manager);

      await manager.delete(EventResponseValue, { response_id: responseId });

      const rows = fields
        .filter((field) => finalValues[field.id] !== undefined)
        .map((field) =>
          manager.create(EventResponseValue, {
            id: uuidv4(),
            response_id: responseId,
            field_id: field.id,
            value: JSON.stringify(finalValues[field.id]),
          }),
        );
      if (rows.length) await manager.save(EventResponseValue, rows);
      await this.syncResponseItems(responseId, fields, finalValues, manager);
    });

    return this.toRow(response, finalValues);
  }

  async remove(eventId: string, responseId: string): Promise<void> {
    await this.findResponseOrThrow(eventId, responseId);
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(EventResponseValue, { response_id: responseId });
      await manager.delete(ResponseItem, { response_id: responseId });
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
      await manager.delete(ResponseItem, { response_id: In(ids) });
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

  async setItemStatus(eventId: string, responseId: string, itemId: string, statusId: string | null): Promise<AdminResponseRow> {
    const response = await this.findResponseOrThrow(eventId, responseId);
    const item = await this.findResponseItemOrThrow(responseId, itemId);
    if (statusId) {
      const status = await this.statuses.findOne({ where: { id: statusId } });
      if (!status) throw new NotFoundException({ code: 'STATUS_NOT_FOUND', message: 'Response status not found' });
    }
    item.status_id = statusId;
    await this.items.save(item);
    return this.toRow(response, await this.currentValues(responseId));
  }

  async setItemAssignee(eventId: string, responseId: string, itemId: string, userId: string | null): Promise<AdminResponseRow> {
    const response = await this.findResponseOrThrow(eventId, responseId);
    const item = await this.findResponseItemOrThrow(responseId, itemId);
    if (userId) {
      const user = await this.users.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    item.assigned_to = userId;
    await this.items.save(item);
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

    const items = await this.items.find({ where: { response_id: In(responses.map((r) => r.id)) } });
    const itemsByResponse = new Map<string, ResponseItem[]>();
    for (const it of items) {
      const list = itemsByResponse.get(it.response_id) ?? [];
      list.push(it);
      itemsByResponse.set(it.response_id, list);
    }

    const [statusMap, userMap] = await this.lookupMaps(responses, items);
    const fieldLabelMap = new Map(fields.map((f) => [f.id, f.label]));

    return {
      fields,
      responses: responses.map((r) => {
        const values = Object.fromEntries(
          (byResponse.get(r.id) ?? []).map((v) => [v.field_id, safeParse(v.value)]),
        );
        return {
          id: r.id,
          referenceNumber: r.reference_number,
          submittedAt: r.submitted_at,
          values,
          status: r.status_id ? statusMap.get(r.status_id) ?? null : null,
          assignee: r.assigned_to ? userMap.get(r.assigned_to) ?? null : null,
          items: this.buildItemRows(itemsByResponse.get(r.id) ?? [], values, statusMap, userMap, fieldLabelMap),
        };
      }),
    };
  }

  /** Cross-event listing for the global "Responses" admin page — includes field
   *  values so the same view/edit/WhatsApp actions as the per-event page work
   *  here too; the frontend fetches each event's field labels on demand. */
  async findAllAcrossEvents(filters: CrossEventResponseFilters): Promise<CrossEventResponseRow[]> {
    const where: Record<string, unknown> = {};
    if (filters.eventId) where.event_id = filters.eventId;
    if (filters.assigneeId) where.assigned_to = filters.assigneeId;
    if (filters.dateFrom && filters.dateTo) {
      where.submitted_at = Between(startOfDay(filters.dateFrom), endOfDay(filters.dateTo));
    } else if (filters.dateFrom) {
      where.submitted_at = MoreThanOrEqual(startOfDay(filters.dateFrom));
    } else if (filters.dateTo) {
      where.submitted_at = LessThanOrEqual(endOfDay(filters.dateTo));
    }

    const responses = await this.responses.find({ where, order: { submitted_at: 'DESC' } });
    if (responses.length === 0) return [];

    const items = await this.items.find({ where: { response_id: In(responses.map((r) => r.id)) } });
    const itemsByResponse = new Map<string, ResponseItem[]>();
    for (const it of items) {
      const list = itemsByResponse.get(it.response_id) ?? [];
      list.push(it);
      itemsByResponse.set(it.response_id, list);
    }

    const [statusMap, userMap] = await this.lookupMaps(responses, items);
    const eventIds = [...new Set(responses.map((r) => r.event_id))];
    const eventRows = await this.events.find({ where: { id: In(eventIds) }, select: { id: true, name: true } });
    const eventMap = new Map(eventRows.map((e) => [e.id, { id: e.id, name: e.name }]));

    const fieldIds = [...new Set(items.map((i) => i.field_id))];
    const fieldRows = fieldIds.length
      ? await this.formFields.find({ where: { id: In(fieldIds) }, select: { id: true, label: true } })
      : [];
    const fieldLabelMap = new Map(fieldRows.map((f) => [f.id, f.label]));

    const allValues = await this.values.find({ where: { response_id: In(responses.map((r) => r.id)) } });
    const valuesByResponse = new Map<string, EventResponseValue[]>();
    for (const v of allValues) {
      const list = valuesByResponse.get(v.response_id) ?? [];
      list.push(v);
      valuesByResponse.set(v.response_id, list);
    }

    return responses.map((r) => {
      const values = Object.fromEntries(
        (valuesByResponse.get(r.id) ?? []).map((v) => [v.field_id, safeParse(v.value)]),
      );
      return {
        id: r.id,
        referenceNumber: r.reference_number,
        submittedAt: r.submitted_at,
        values,
        status: r.status_id ? statusMap.get(r.status_id) ?? null : null,
        assignee: r.assigned_to ? userMap.get(r.assigned_to) ?? null : null,
        event: eventMap.get(r.event_id) ?? { id: r.event_id, name: '(deleted event)' },
        items: this.buildItemRows(itemsByResponse.get(r.id) ?? [], values, statusMap, userMap, fieldLabelMap),
      };
    });
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
    const items = await this.items.find({ where: { response_id: response.id } });
    const [statusMap, userMap] = await this.lookupMaps([response], items);
    const fieldIds = [...new Set(items.map((i) => i.field_id))];
    const fieldRows = fieldIds.length
      ? await this.formFields.find({ where: { id: In(fieldIds) }, select: { id: true, label: true } })
      : [];
    const fieldLabelMap = new Map(fieldRows.map((f) => [f.id, f.label]));
    return {
      id: response.id,
      referenceNumber: response.reference_number,
      submittedAt: response.submitted_at,
      values,
      status: response.status_id ? statusMap.get(response.status_id) ?? null : null,
      assignee: response.assigned_to ? userMap.get(response.assigned_to) ?? null : null,
      items: this.buildItemRows(items, values, statusMap, userMap, fieldLabelMap),
    };
  }

  /** Joins each ResponseItem's live value/codes out of the response's parsed field values. */
  private buildItemRows(
    items: ResponseItem[],
    values: Record<string, EventFieldValue>,
    statusMap: Map<string, { id: string; name: string; tone: string }>,
    userMap: Map<string, { id: string; name: string }>,
    fieldLabelMap: Map<string, string>,
  ): ResponseItemRow[] {
    return items.map((item) => {
      const raw = values[item.field_id];
      const entries = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, ItemListEntry>) : {};
      const entry = entries[item.item_label];
      return {
        id: item.id,
        fieldId: item.field_id,
        fieldLabel: fieldLabelMap.get(item.field_id) ?? '',
        itemLabel: item.item_label,
        value: entry?.value ?? '',
        codes: entry?.codes ?? [],
        status: item.status_id ? statusMap.get(item.status_id) ?? null : null,
        assignee: item.assigned_to ? userMap.get(item.assigned_to) ?? null : null,
      };
    });
  }

  private async findResponseItemOrThrow(responseId: string, itemId: string): Promise<ResponseItem> {
    const item = await this.items.findOne({ where: { id: itemId, response_id: responseId } });
    if (!item) {
      throw new BadRequestException({ code: 'NOT_FOUND', message: 'Response item not found.' });
    }
    return item;
  }

  /** For item_list fields: keeps the ResponseItem rows (per-item status/assignee tracking) in sync
   *  with whatever items are actually filled in — inserts new ones without touching existing
   *  status/assignee, and drops rows for items the admin removed on edit. Runs inside the caller's
   *  transaction so it's atomic with the response/value write. */
  private async syncResponseItems(
    responseId: string,
    fields: EventFormField[],
    values: Record<string, EventFieldValue>,
    manager: EntityManager,
  ): Promise<void> {
    const itemFields = fields.filter((f) => f.field_type === EventFieldType.ITEM_LIST);
    const existing = await manager.find(ResponseItem, { where: { response_id: responseId } });
    const existingByKey = new Map(existing.map((i) => [`${i.field_id}:${i.item_label}`, i]));
    const seenKeys = new Set<string>();
    const toInsert: ResponseItem[] = [];

    for (const field of itemFields) {
      const raw = values[field.id];
      if (!raw || Array.isArray(raw) || typeof raw !== 'object') continue;
      const entries = raw as Record<string, ItemListEntry>;
      for (const item of field.options ?? []) {
        const entry = entries[item];
        if (!entry?.value?.trim()) continue;
        const key = `${field.id}:${item}`;
        seenKeys.add(key);
        if (existingByKey.has(key)) continue;
        toInsert.push(
          manager.create(ResponseItem, {
            id: uuidv4(),
            response_id: responseId,
            field_id: field.id,
            item_label: item,
            status_id: null,
            assigned_to: null,
          }),
        );
      }
    }
    if (toInsert.length) await manager.save(ResponseItem, toInsert);

    const stale = existing.filter((i) => !seenKeys.has(`${i.field_id}:${i.item_label}`));
    if (stale.length) await manager.delete(ResponseItem, { id: In(stale.map((i) => i.id)) });
  }

  private async lookupMaps(
    responses: EventResponse[],
    items: ResponseItem[] = [],
  ): Promise<[Map<string, { id: string; name: string; tone: string }>, Map<string, { id: string; name: string }>]> {
    const statusIds = [
      ...new Set(
        [...responses.map((r) => r.status_id), ...items.map((i) => i.status_id)].filter((id): id is string => !!id),
      ),
    ];
    const userIds = [
      ...new Set(
        [...responses.map((r) => r.assigned_to), ...items.map((i) => i.assigned_to)].filter(
          (id): id is string => !!id,
        ),
      ),
    ];

    const [statusRows, userRows] = await Promise.all([
      statusIds.length ? this.statuses.find({ where: { id: In(statusIds) } }) : Promise.resolve([]),
      userIds.length ? this.users.find({ where: { id: In(userIds) } }) : Promise.resolve([]),
    ]);

    return [
      new Map(statusRows.map((s) => [s.id, { id: s.id, name: s.name, tone: s.tone }])),
      new Map(userRows.map((u) => [u.id, { id: u.id, name: u.name }])),
    ];
  }

  /** For item_list fields with per-item auto serial numbers enabled: parses the
   *  entered value as a quantity and, if it's a fresh entry (no codes yet), mints
   *  that many sequential codes and advances the field's stored cursor. Runs inside
   *  the caller's transaction so the cursor update is atomic with the response write. */
  private async assignItemSerialCodes(
    fields: EventFormField[],
    values: Record<string, EventFieldValue>,
    manager: EntityManager,
  ): Promise<Record<string, EventFieldValue>> {
    const result = { ...values };
    for (const field of fields) {
      if (field.field_type !== EventFieldType.ITEM_LIST || !field.item_serial_config) continue;
      const raw = result[field.id];
      if (raw === undefined || Array.isArray(raw) || typeof raw !== 'object') continue;

      const entries = raw as Record<string, ItemListEntry>;
      const options = field.options ?? [];
      let fieldChanged = false;
      const nextConfig = field.item_serial_config.map((cfg, i) => {
        const item = options[i];
        const entry = item ? entries[item] : undefined;
        if (!cfg.enabled || !entry || entry.codes?.length) return cfg;
        const qty = parseInt(entry.value, 10);
        if (!Number.isInteger(qty) || qty <= 0) return cfg;

        const codes = Array.from({ length: qty }, (_, k) => `${cfg.prefix}${cfg.next + k}`);
        entries[item] = { ...entry, codes };
        fieldChanged = true;
        return { ...cfg, next: cfg.next + qty };
      });

      if (fieldChanged) {
        field.item_serial_config = nextConfig;
        await manager.save(EventFormField, field);
      }
      result[field.id] = entries;
    }
    return result;
  }

  private assertRequiredFieldsPresent(fields: EventFormField[], values: Record<string, EventFieldValue>): void {
    const missing = fields.filter((field) => {
      if (!field.is_required) return false;
      const v = values[field.id];
      if (v === undefined || v === null) return true;
      if (Array.isArray(v)) return v.length === 0;
      if (field.field_type === EventFieldType.ITEM_LIST) {
        const entries = v as Record<string, ItemListEntry>;
        return (field.options ?? []).some((item) => !entries[item]?.value?.trim());
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

function startOfDay(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00.000Z`);
}

function endOfDay(dateIso: string): Date {
  return new Date(`${dateIso}T23:59:59.999Z`);
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
    return Object.entries(value as Record<string, ItemListEntry>)
      .map(([item, entry]) => `${item}: ${entry.value}${entry.codes?.length ? ` [${entry.codes.join(', ')}]` : ''}`)
      .join('; ');
  }
  return value;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
