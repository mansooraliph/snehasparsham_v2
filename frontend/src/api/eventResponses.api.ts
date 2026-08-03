import { http } from './http';
import type { EventFieldValue } from '@/types/eventField';
import type { EventFormFieldRecord } from '@/types/eventField';

export interface AdminResponseRow {
  id: string;
  submittedAt: string;
  values: Record<string, EventFieldValue>;
}

export interface EventResponsesListing {
  fields: EventFormFieldRecord[];
  responses: AdminResponseRow[];
}

export const eventResponsesApi = {
  /** Public submission — no auth (events-registration-module.md §3.4). */
  submit: (eventId: string, values: Record<string, EventFieldValue>) =>
    http.post<{ id: string }>(`/events/${eventId}/responses`, { values }).then((r) => r.data),

  listForEvent: (eventId: string) =>
    http.get<EventResponsesListing>(`/events/${eventId}/responses`).then((r) => r.data),

  update: (eventId: string, responseId: string, values: Record<string, EventFieldValue>) =>
    http
      .patch<AdminResponseRow>(`/events/${eventId}/responses/${responseId}`, { values })
      .then((r) => r.data),

  /** Triggers a CSV file download via a plain navigation (auth header can't ride along
   *  a `<a download>` click, so this fetches as a blob and saves it client-side). */
  async downloadCsv(eventId: string, filename: string): Promise<void> {
    const res = await http.get(`/events/${eventId}/responses/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },
};
