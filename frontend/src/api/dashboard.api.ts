import { http } from './http';
import type { DashboardStats } from '@/types/dashboard';

export const dashboardApi = {
  getStats: () => http.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
};
