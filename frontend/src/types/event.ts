export type EventStatus = 'draft' | 'published' | 'closed' | 'cancelled';

export interface EventRecord {
  id: string;
  name: string;
  poster_url: string | null;
  description: string | null;
  location: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: EventStatus;
  registration_deadline: string | null;
  max_participants: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** Only present on the public detail endpoint — used to disable submission once seats are full. */
  responseCount?: number;
}

export interface CreateEventInput {
  name: string;
  posterUrl?: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  status?: EventStatus;
  registrationDeadline?: string;
  maxParticipants?: number;
}
