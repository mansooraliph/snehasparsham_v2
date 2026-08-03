import { http } from './http';
import type { CreateEventInput, EventRecord } from '@/types/event';
import type { EventFormFieldRecord } from '@/types/eventField';

export const eventsApi = {
  /** Uploads a poster image file and returns its served URL. */
  uploadPoster: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http
      .post<{ url: string }>('/uploads/poster', formData, { headers: { 'Content-Type': undefined } })
      .then((r) => r.data.url);
  },
  list: () => http.get<EventRecord[]>('/events').then((r) => r.data),
  get: (id: string) => http.get<EventRecord>(`/events/${id}`).then((r) => r.data),
  create: (input: CreateEventInput) => http.post<EventRecord>('/events', input).then((r) => r.data),
  update: (id: string, input: Partial<CreateEventInput>) =>
    http.put<EventRecord>(`/events/${id}`, input).then((r) => r.data),
  remove: (id: string) => http.delete<void>(`/events/${id}`).then((r) => r.data),
  clone: (id: string) => http.post<EventRecord>(`/events/${id}/clone`).then((r) => r.data),
};

/** No auth required — events-registration-module.md §3.3/§3.4 public browsing. */
export const publicEventsApi = {
  list: () => http.get<EventRecord[]>('/events/public').then((r) => r.data),
  get: (id: string) => http.get<EventRecord>(`/events/public/${id}`).then((r) => r.data),
  listFields: (id: string) => http.get<EventFormFieldRecord[]>(`/events/public/${id}/fields`).then((r) => r.data),
};
