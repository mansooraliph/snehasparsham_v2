import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, Pencil, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { eventsApi } from '@/api/events.api';
import { getApiErrorMessage } from '@/api/http';
import { EventFormDrawer } from './EventFormDrawer';
import type { EventRecord, EventStatus } from '@/types/event';

const STATUS_TONE: Record<EventStatus, 'neutral' | 'green' | 'amber' | 'red'> = {
  draft: 'neutral',
  published: 'green',
  closed: 'amber',
  cancelled: 'red',
};

export function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerEvent, setDrawerEvent] = useState<EventRecord | 'new' | null>(null);

  function loadEvents() {
    eventsApi
      .list()
      .then(setEvents)
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load events')));
  }

  useEffect(loadEvents, []);

  function handleSaved(saved: EventRecord) {
    const wasCreate = drawerEvent === 'new';
    setDrawerEvent(null);
    loadEvents();
    if (wasCreate) navigate(`/admin/events/${saved.id}/fields`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Create events and let the public register through a per-event form.
        </p>
        <Button onClick={() => setDrawerEvent('new')}>
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      <div className="overflow-x-auto rounded-card border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-table-head text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-4 py-3">S.No</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {events?.map((event, index) => (
              <tr key={event.id} className="border-t border-border">
                <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-text-primary">{event.name}</td>
                <td className="px-4 py-3 text-text-muted">{event.location}</td>
                <td className="px-4 py-3 text-text-muted">
                  {event.start_date}
                  {event.end_date !== event.start_date ? ` – ${event.end_date}` : ''}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[event.status]}>{event.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/events/${event.id}/fields`)}
                      aria-label="Edit form fields"
                      className="text-text-faint hover:text-blue"
                    >
                      <ListChecks className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/events/${event.id}/responses`)}
                      aria-label="View responses"
                      className="text-text-faint hover:text-blue"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerEvent(event)}
                      aria-label="Edit event"
                      className="text-text-faint hover:text-blue"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {events?.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            No events yet. Click "Create Event" to add your first one.
          </p>
        )}
        {events === null && !error && (
          <p className="px-4 py-8 text-center text-sm text-text-muted">Loading…</p>
        )}
      </div>

      <EventFormDrawer
        open={drawerEvent !== null}
        event={drawerEvent === 'new' || drawerEvent === null ? undefined : drawerEvent}
        onClose={() => setDrawerEvent(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}
