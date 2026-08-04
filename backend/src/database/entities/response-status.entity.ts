import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Badge color — mirrors the frontend's Badge tone options. */
export type ResponseStatusTone = 'neutral' | 'blue' | 'green' | 'amber' | 'red';

/**
 * Admin-configurable master list of response statuses (e.g. Pending, Approved,
 * Rejected, Fulfilled) — global across every event, not per-event, per the
 * scope decided with the user.
 */
@Entity('response_statuses')
export class ResponseStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', default: 'neutral' })
  tone: ResponseStatusTone;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
