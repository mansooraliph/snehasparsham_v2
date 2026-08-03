import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** events-registration-module.md §4 — Event_Response_Values table (key-value,
 *  so admins can add/remove form fields without a schema migration). */
@Entity('event_response_values')
export class EventResponseValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  response_id: string;

  @Index()
  @Column()
  field_id: string;

  /** JSON-encoded — a plain string for most field types, a string[] for checkbox. */
  @Column({ type: 'text' })
  value: string;
}
