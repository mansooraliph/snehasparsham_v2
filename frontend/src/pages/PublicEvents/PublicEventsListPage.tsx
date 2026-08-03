import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { publicEventsApi } from '@/api/events.api';
import { getApiErrorMessage } from '@/api/http';
import type { EventRecord } from '@/types/event';

function formatDateRange(event: EventRecord): string {
  return event.start_date === event.end_date ? event.start_date : `${event.start_date} – ${event.end_date}`;
}

export function PublicEventsListPage() {
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    publicEventsApi
      .list()
      .then(setEvents)
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load events')));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Upcoming Events</h1>
        <p className="mt-1 text-sm text-text-muted">
          Training workshops, awareness camps, and relief drives open for public registration.
        </p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events?.map((event) => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className="overflow-hidden rounded-card border border-border bg-white transition-shadow hover:shadow-md"
          >
            {event.poster_url ? (
              <img src={event.poster_url} alt={event.name} className="h-36 w-full object-cover" />
            ) : (
              <div className="flex h-36 w-full items-center justify-center bg-table-alt text-text-faint">
                <CalendarDays className="h-8 w-8" />
              </div>
            )}
            <div className="space-y-1.5 p-4">
              <h2 className="truncate font-medium text-text-primary">{event.name}</h2>
              <p className="flex items-center gap-1.5 text-sm text-text-muted">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{event.location}</span>
              </p>
              <p className="flex items-center gap-1.5 text-sm text-text-muted">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                {formatDateRange(event)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {events?.length === 0 && <p className="text-sm text-text-muted">No events are open right now — check back soon.</p>}
      {events === null && !error && <p className="text-sm text-text-muted">Loading…</p>}
    </div>
  );
}
