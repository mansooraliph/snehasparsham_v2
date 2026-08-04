import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventStatus } from '../../common/enums/event-status.enum';

/** events-registration-module.md §4 — Events table. */
@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  poster_url: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  location: string;

  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date' })
  end_date: string;

  @Column({ type: 'time', nullable: true })
  start_time: string | null;

  @Column({ type: 'time', nullable: true })
  end_time: string | null;

  @Index()
  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ type: 'date', nullable: true })
  registration_deadline: string | null;

  @Column({ type: 'int', nullable: true })
  max_participants: number | null;

  /** Template for the Admin's WhatsApp share message — supports {{tokens}}
   *  resolved client-side from the response's field values plus event info. */
  @Column({ type: 'text', nullable: true })
  message_template: string | null;

  /** Reference number series (null prefix = fall back to a random 10-digit code). */
  @Column({ type: 'varchar', nullable: true })
  reference_prefix: string | null;

  /** Next sequential number to assign — atomically incremented on each submission. */
  @Column({ type: 'int', default: 1 })
  reference_next_number: number;

  /** How many digits the sequential number is zero-padded to. */
  @Column({ type: 'int', default: 4 })
  reference_padding: number;

  @Index()
  @Column()
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
