import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** events-registration-module.md §4 — Event_Responses table. */
@Entity('event_responses')
export class EventResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  event_id: string;

  /** Nullable — public form submission never requires login (spec §6 open item 1). */
  @Column({ type: 'varchar', nullable: true })
  submitted_by: string | null;

  /** Shown to the submitter after registering, so they have something to quote when following up. */
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reference_number: string;

  @CreateDateColumn({ type: 'timestamptz' })
  submitted_at: Date;
}
