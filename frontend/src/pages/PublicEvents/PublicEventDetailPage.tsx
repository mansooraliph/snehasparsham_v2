import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { publicEventsApi } from '@/api/events.api';
import { eventResponsesApi } from '@/api/eventResponses.api';
import { getApiErrorMessage } from '@/api/http';
import { toHm } from '@/lib/utils/formatTime';
import { FieldInput } from '@/components/events/FieldInput';
import type { EventRecord } from '@/types/event';
import type { EventFieldValue, EventFormFieldRecord } from '@/types/eventField';

export function PublicEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [fields, setFields] = useState<EventFormFieldRecord[] | null>(null);
  const [values, setValues] = useState<Record<string, EventFieldValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([publicEventsApi.get(id), publicEventsApi.listFields(id)])
      .then(([e, f]) => {
        setEvent(e);
        setFields(f);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Event not found')));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/events" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
        <p className="text-sm text-red">{error}</p>
      </div>
    );
  }

  if (!event) return <p className="text-sm text-text-muted">Loading…</p>;

  const dateRange = event.start_date === event.end_date ? event.start_date : `${event.start_date} – ${event.end_date}`;
  const timeRange = event.start_time ? `${toHm(event.start_time)}${event.end_time ? ` – ${toHm(event.end_time)}` : ''}` : null;

  const deadlinePassed = !!event.registration_deadline && event.registration_deadline < new Date().toISOString().slice(0, 10);
  const seatsFull =
    event.max_participants !== null && (event.responseCount ?? 0) >= (event.max_participants ?? Infinity);
  const registrationClosed = deadlinePassed || seatsFull;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await eventResponsesApi.submit(id, values);
      setReferenceNumber(result.referenceNumber);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Could not submit the form'));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/events" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      {event.poster_url && (
        <img src={event.poster_url} alt={event.name} className="max-h-80 w-full rounded-card object-cover" />
      )}

      <div>
        <h1 className="text-xl font-semibold text-text-primary">{event.name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {event.location}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {dateRange}
          </span>
          {timeRange && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {timeRange}
            </span>
          )}
        </div>
        {event.description && <p className="mt-4 whitespace-pre-line text-sm text-text-primary">{event.description}</p>}
      </div>

      {fields && fields.length > 0 && (
        <div className="rounded-card border border-border bg-white p-6">
          {referenceNumber ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-5 w-5 text-green" />
              <p className="text-sm font-medium text-green">Thanks — your submission has been received.</p>
              <p className="text-sm text-text-muted">Your reference number:</p>
              <p className="rounded-card bg-table-head px-4 py-2 font-mono text-base font-semibold text-text-primary">
                {referenceNumber}
              </p>
              <p className="text-xs text-text-muted">Save this number — quote it if you need to follow up.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-sm font-semibold text-text-primary">Registration Form</h2>

              {registrationClosed && (
                <p className="rounded-card bg-amber/10 px-3 py-2 text-sm text-amber">
                  {deadlinePassed ? 'The registration deadline for this event has passed.' : 'This event has reached its participant limit.'}
                </p>
              )}

              <fieldset disabled={registrationClosed || isSubmitting} className="space-y-4">
                {fields.map((field) => (
                  <FieldInput
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
                  />
                ))}
              </fieldset>

              {submitError && <p className="text-sm text-red">{submitError}</p>}

              <Button type="submit" loading={isSubmitting} disabled={registrationClosed}>
                Submit
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
