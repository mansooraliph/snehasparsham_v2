import { Drawer } from '@/components/ui/Drawer';
import { eventsApi } from '@/api/events.api';
import { getApiErrorMessage } from '@/api/http';
import { toHm } from '@/lib/utils/formatTime';
import { EventForm } from './EventForm';
import type { EventFormValues } from './EventForm';
import type { CreateEventInput, EventRecord } from '@/types/event';

interface EventFormDrawerProps {
  open: boolean;
  /** Present in edit mode, absent in create mode. */
  event?: EventRecord;
  onClose: () => void;
  onSaved: (event: EventRecord) => void;
}

function toFormValues(event: EventRecord): Partial<EventFormValues> {
  return {
    name: event.name,
    description: event.description ?? '',
    location: event.location,
    posterUrl: event.poster_url ?? '',
    startDate: event.start_date,
    endDate: event.end_date,
    startTime: toHm(event.start_time),
    endTime: toHm(event.end_time),
    registrationDeadline: event.registration_deadline ?? '',
    maxParticipants: event.max_participants ? String(event.max_participants) : '',
    status: event.status,
  };
}

export function EventFormDrawer({ open, event, onClose, onSaved }: EventFormDrawerProps) {
  const isEdit = !!event;

  async function handleSubmit(input: CreateEventInput) {
    try {
      const saved = isEdit ? await eventsApi.update(event!.id, input) : await eventsApi.create(input);
      onSaved(saved);
    } catch (err) {
      throw new Error(getApiErrorMessage(err, isEdit ? 'Could not update event' : 'Could not create event'));
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit Event' : 'Create Event'}>
      {open && (
        <EventForm
          key={event?.id ?? 'new'}
          initialValues={event ? toFormValues(event) : undefined}
          submitLabel={isEdit ? 'Save Changes' : 'Create Event'}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      )}
    </Drawer>
  );
}
