import { create } from 'zustand';
import { roleLabelsApi } from '@/api/roleLabels.api';
import { ROLE_LABELS as DEFAULT_ROLE_LABELS } from '@/types/auth';
import type { Role } from '@/types/auth';

interface RoleLabelsState {
  labels: Record<Role, string>;
  load: () => Promise<void>;
  setLabel: (role: Role, label: string) => Promise<void>;
}

/** Admin-editable display labels per role — starts from the built-in defaults
 *  so the UI never shows a blank label before the fetch resolves. */
export const useRoleLabelsStore = create<RoleLabelsState>((set) => ({
  labels: DEFAULT_ROLE_LABELS,

  load: async () => {
    const labels = await roleLabelsApi.list();
    set({ labels });
  },

  setLabel: async (role, label) => {
    const labels = await roleLabelsApi.update(role, label);
    set({ labels });
  },
}));
