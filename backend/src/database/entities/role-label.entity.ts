import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../common/enums/role.enum';

/** Admin-editable display label per fixed role — the role table itself (and the
 *  capabilities each role grants) stays fixed; only the label shown in the UI
 *  can be renamed. */
@Entity('role_labels')
export class RoleLabel {
  @PrimaryColumn({ type: 'enum', enum: Role })
  role: Role;

  @Column()
  label: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
