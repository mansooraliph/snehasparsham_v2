import { http } from './http';
import type { CreateEventFieldInput, EventFormFieldRecord } from '@/types/eventField';

export const eventFieldsApi = {
  list: (eventId: string) => http.get<EventFormFieldRecord[]>(`/events/${eventId}/fields`).then((r) => r.data),

  create: (eventId: string, input: CreateEventFieldInput) =>
    http.post<EventFormFieldRecord>(`/events/${eventId}/fields`, input).then((r) => r.data),

  update: (eventId: string, fieldId: string, input: Partial<CreateEventFieldInput>) =>
    http.put<EventFormFieldRecord>(`/events/${eventId}/fields/${fieldId}`, input).then((r) => r.data),

  remove: (eventId: string, fieldId: string) =>
    http.delete<void>(`/events/${eventId}/fields/${fieldId}`).then((r) => r.data),

  reorder: (eventId: string, orderedFieldIds: string[]) =>
    http
      .put<EventFormFieldRecord[]>(`/events/${eventId}/fields/reorder`, { orderedFieldIds })
      .then((r) => r.data),
};
