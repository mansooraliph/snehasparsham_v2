import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Per-item status/assignee tracking for `item_list` field entries within a response —
 *  additive to EventResponse's own status_id/assigned_to, which stay response-wide. */
@Entity('event_response_items')
@Index(['response_id', 'field_id', 'item_label'], { unique: true })
export class ResponseItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  response_id: string;

  @Index()
  @Column()
  field_id: string;

  /** Matches the item's label in the owning field's `options[]` — item_list entries have no stable id. */
  @Column()
  item_label: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  status_id: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  assigned_to: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
