import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EventFieldType } from '../../common/enums/event-field-type.enum';
import { ItemSerialConfig } from '../../common/types/item-serial-config';

/** events-registration-module.md §4 — Event_Form_Fields table. */
@Entity('event_form_fields')
export class EventFormField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  event_id: string;

  @Column()
  label: string;

  @Column({ type: 'enum', enum: EventFieldType })
  field_type: EventFieldType;

  /** Only populated for dropdown/radio/checkbox fields. */
  @Column({ type: 'jsonb', nullable: true })
  options: string[] | null;

  /** item_list only — one entry per `options[i]`, in the same order. */
  @Column({ type: 'jsonb', nullable: true })
  item_serial_config: ItemSerialConfig[] | null;

  @Column({ type: 'boolean', default: false })
  is_required: boolean;

  @Column({ type: 'int' })
  order: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
