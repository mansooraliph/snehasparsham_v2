import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleLabel } from '../../database/entities/role-label.entity';
import { Role } from '../../common/enums/role.enum';

/** Mirrors the frontend's default ROLE_LABELS (types/auth.ts) — seeded once,
 *  then admin-editable from there on. */
export const DEFAULT_ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Super Admin',
  [Role.DISTRICT_STATE_ADMIN]: 'District/State Admin',
  [Role.GOVERNMENT_OFFICIAL]: 'Government Official',
  [Role.FIELD_RESPONDER]: 'Field Responder',
  [Role.VOLUNTEER]: 'Volunteer',
  [Role.NGO_PARTNER]: 'NGO/Partner Organization',
  [Role.PUBLIC_CITIZEN]: 'Public/Citizen',
};

@Injectable()
export class RoleLabelsService implements OnModuleInit {
  constructor(
    @InjectRepository(RoleLabel)
    private readonly roleLabels: Repository<RoleLabel>,
  ) {}

  /** Lazy-seed defaults for any role that doesn't have a row yet — covers both
   *  first boot and roles added to the enum after the table already exists. */
  async onModuleInit(): Promise<void> {
    const existing = await this.roleLabels.find();
    const existingRoles = new Set(existing.map((r) => r.role));
    const missing = Object.values(Role)
      .filter((role) => !existingRoles.has(role))
      .map((role) => this.roleLabels.create({ role, label: DEFAULT_ROLE_LABELS[role] }));
    if (missing.length) await this.roleLabels.save(missing);
  }

  async findAll(): Promise<Record<Role, string>> {
    const rows = await this.roleLabels.find();
    const map = { ...DEFAULT_ROLE_LABELS };
    for (const row of rows) map[row.role] = row.label;
    return map;
  }

  async update(role: Role, label: string): Promise<Record<Role, string>> {
    await this.roleLabels.upsert({ role, label: label.trim() }, ['role']);
    return this.findAll();
  }
}
