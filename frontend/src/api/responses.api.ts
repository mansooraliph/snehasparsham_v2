import { http } from './http';
import type { CrossEventResponseRow, ResponseFilters } from '@/types/response';

/** Cross-event listing — the per-event CRUD/detail calls live in eventResponses.api.ts. */
export const responsesApi = {
  list: (filters: ResponseFilters) =>
    http
      .get<CrossEventResponseRow[]>('/responses', {
        params: {
          eventId: filters.eventId || undefined,
          assigneeId: filters.assigneeId || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      })
      .then((r) => r.data),
};
