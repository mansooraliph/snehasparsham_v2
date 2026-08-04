import { http } from './http';
import type { ResponseStatusInput, ResponseStatusRecord } from '@/types/responseStatus';

export const responseStatusesApi = {
  list: () => http.get<ResponseStatusRecord[]>('/response-statuses').then((r) => r.data),
  create: (input: ResponseStatusInput) => http.post<ResponseStatusRecord>('/response-statuses', input).then((r) => r.data),
  update: (id: string, input: Partial<ResponseStatusInput>) =>
    http.put<ResponseStatusRecord>(`/response-statuses/${id}`, input).then((r) => r.data),
  remove: (id: string) => http.delete<void>(`/response-statuses/${id}`).then((r) => r.data),
  reorder: (orderedIds: string[]) =>
    http.put<ResponseStatusRecord[]>('/response-statuses/reorder', { orderedIds }).then((r) => r.data),
};
