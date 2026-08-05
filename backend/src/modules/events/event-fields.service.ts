import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventFormField } from '../../database/entities/event-form-field.entity';
import { CreateEventFieldDto } from './dto/create-event-field.dto';
import { UpdateEventFieldDto } from './dto/update-event-field.dto';
import { ItemSerialConfig, ItemSerialConfigInput } from '../../common/types/item-serial-config';

/** Builds the stored per-item serial config aligned with `options`, carrying the
 *  running `next` cursor forward for items whose enabled/start didn't change —
 *  editing the starting number (or freshly enabling it) resets the cursor. */
function mergeItemSerialConfig(
  options: string[] | undefined,
  input: ItemSerialConfigInput[] | undefined,
  existing: ItemSerialConfig[] | null,
): ItemSerialConfig[] | null {
  if (!options?.length) return null;
  return options.map((_, i) => {
    const cfg = input?.[i];
    if (!cfg?.enabled) return { enabled: false, prefix: '', start: 1, next: 1 };
    const start = cfg.start ?? 1;
    const prefix = cfg.prefix?.trim() ?? '';
    const prev = existing?.[i];
    const next = prev?.enabled && prev.start === start ? prev.next : start;
    return { enabled: true, prefix, start, next };
  });
}

@Injectable()
export class EventFieldsService {
  constructor(
    @InjectRepository(EventFormField)
    private readonly fields: Repository<EventFormField>,
  ) {}

  findAllForEvent(eventId: string): Promise<EventFormField[]> {
    return this.fields.find({ where: { event_id: eventId }, order: { order: 'ASC' } });
  }

  async create(eventId: string, dto: CreateEventFieldDto): Promise<EventFormField> {
    const count = await this.fields.count({ where: { event_id: eventId } });
    const field = this.fields.create({
      event_id: eventId,
      label: dto.label,
      field_type: dto.fieldType,
      options: dto.options ?? null,
      item_serial_config: mergeItemSerialConfig(dto.options, dto.itemSerialConfig, null),
      is_required: dto.isRequired ?? false,
      order: count,
    });
    return this.fields.save(field);
  }

  async update(eventId: string, fieldId: string, dto: UpdateEventFieldDto): Promise<EventFormField> {
    const field = await this.findOneOrThrow(eventId, fieldId);
    Object.assign(field, {
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.fieldType !== undefined && { field_type: dto.fieldType }),
      ...(dto.options !== undefined && { options: dto.options }),
      ...((dto.options !== undefined || dto.itemSerialConfig !== undefined) && {
        item_serial_config: mergeItemSerialConfig(
          dto.options ?? field.options ?? undefined,
          dto.itemSerialConfig ?? field.item_serial_config ?? undefined,
          field.item_serial_config,
        ),
      }),
      ...(dto.isRequired !== undefined && { is_required: dto.isRequired }),
      ...(dto.order !== undefined && { order: dto.order }),
    });
    return this.fields.save(field);
  }

  async remove(eventId: string, fieldId: string): Promise<void> {
    const field = await this.findOneOrThrow(eventId, fieldId);
    await this.fields.remove(field);
  }

  /** Persists a full reordering — `orderedFieldIds` is the new top-to-bottom order. */
  async reorder(eventId: string, orderedFieldIds: string[]): Promise<EventFormField[]> {
    const fields = await this.findAllForEvent(eventId);
    const byId = new Map(fields.map((f) => [f.id, f]));
    await Promise.all(
      orderedFieldIds.map((id, index) => {
        const field = byId.get(id);
        if (!field) return Promise.resolve();
        return this.fields.update({ id }, { order: index });
      }),
    );
    return this.findAllForEvent(eventId);
  }

  private async findOneOrThrow(eventId: string, fieldId: string): Promise<EventFormField> {
    const field = await this.fields.findOne({ where: { id: fieldId, event_id: eventId } });
    if (!field) {
      throw new NotFoundException({ code: 'FIELD_NOT_FOUND', message: 'Form field not found' });
    }
    return field;
  }
}
