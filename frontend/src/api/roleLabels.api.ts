import { http } from './http';
import type { Role } from '@/types/auth';

export const roleLabelsApi = {
  list: () => http.get<Record<Role, string>>('/role-labels').then((r) => r.data),
  update: (role: Role, label: string) =>
    http.put<Record<Role, string>>(`/role-labels/${role}`, { label }).then((r) => r.data),
};
