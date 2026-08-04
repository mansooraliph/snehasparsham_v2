import type { ResponseStatusTone } from './responseStatus';
import type { EventFieldValue } from './eventField';

export interface CrossEventResponseRow {
  id: string;
  referenceNumber: string;
  submittedAt: string;
  values: Record<string, EventFieldValue>;
  status: { id: string; name: string; tone: ResponseStatusTone } | null;
  assignee: { id: string; name: string } | null;
  event: { id: string; name: string };
}

export interface ResponseFilters {
  eventId?: string;
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
}
