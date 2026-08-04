import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { eventsApi } from '@/api/events.api';
import { getApiErrorMessage } from '@/api/http';
import { DEFAULT_MESSAGE_TEMPLATE } from '@/lib/utils/messageTemplate';
import type { CreateEventInput, EventStatus } from '@/types/event';

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export interface EventFormValues {
  name: string;
  description: string;
  location: string;
  posterUrl: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  maxParticipants: string;
  status: EventStatus;
  messageTemplate: string;
}

const EMPTY_VALUES: EventFormValues = {
  name: '',
  description: '',
  location: '',
  posterUrl: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  registrationDeadline: '',
  maxParticipants: '',
  status: 'draft',
  messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
};

interface EventFormProps {
  initialValues?: Partial<EventFormValues>;
  submitLabel: string;
  onSubmit: (input: CreateEventInput) => Promise<void>;
  onCancel: () => void;
}

export function EventForm({ initialValues, submitLabel, onSubmit, onCancel }: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handlePosterChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPoster(true);
    setError(null);
    try {
      const url = await eventsApi.uploadPoster(file);
      set('posterUrl', url);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not upload poster image'));
    } finally {
      setIsUploadingPoster(false);
      if (posterInputRef.current) posterInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        location: values.location.trim(),
        posterUrl: values.posterUrl.trim() || undefined,
        startDate: values.startDate,
        endDate: values.endDate || values.startDate,
        startTime: values.startTime || undefined,
        endTime: values.endTime || undefined,
        registrationDeadline: values.registrationDeadline || undefined,
        maxParticipants: values.maxParticipants ? Number(values.maxParticipants) : undefined,
        status: values.status,
        messageTemplate: values.messageTemplate.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Event Name" htmlFor="name">
          <Input id="name" value={values.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>

        <Field label="Description" htmlFor="description" hint="Optional">
          <textarea
            id="description"
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className="w-full rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
          />
        </Field>

        <Field label="Poster Image" htmlFor="posterImage" hint="Optional — JPEG, PNG, WEBP or GIF, up to 5MB">
          <div className="flex items-center gap-3">
            {values.posterUrl && (
              <img
                src={values.posterUrl}
                alt="Poster preview"
                className="h-16 w-16 rounded-card border border-border object-cover"
              />
            )}
            <div className="flex flex-col gap-1">
              <input
                id="posterImage"
                ref={posterInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePosterChange}
                disabled={isUploadingPoster}
                className="text-sm text-text-primary file:mr-3 file:rounded-card file:border-0 file:bg-table-alt file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-primary hover:file:bg-border"
              />
              {isUploadingPoster && <p className="text-xs text-text-faint">Uploading…</p>}
              {values.posterUrl && !isUploadingPoster && (
                <button
                  type="button"
                  onClick={() => set('posterUrl', '')}
                  className="self-start text-xs text-red hover:underline"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
        </Field>

        <Field label="Location" htmlFor="location">
          <Input id="location" value={values.location} onChange={(e) => set('location', e.target.value)} required />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date" htmlFor="startDate">
            <Input id="startDate" type="date" value={values.startDate} onChange={(e) => set('startDate', e.target.value)} required />
          </Field>
          <Field label="End Date" htmlFor="endDate" hint="Leave blank for a single-day event">
            <Input id="endDate" type="date" value={values.endDate} onChange={(e) => set('endDate', e.target.value)} min={values.startDate} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Time" htmlFor="startTime" hint="Optional">
            <Input id="startTime" type="time" value={values.startTime} onChange={(e) => set('startTime', e.target.value)} />
          </Field>
          <Field label="End Time" htmlFor="endTime" hint="Optional">
            <Input id="endTime" type="time" value={values.endTime} onChange={(e) => set('endTime', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration Deadline" htmlFor="registrationDeadline" hint="Optional">
            <Input
              id="registrationDeadline"
              type="date"
              value={values.registrationDeadline}
              onChange={(e) => set('registrationDeadline', e.target.value)}
            />
          </Field>
          <Field label="Max Participants" htmlFor="maxParticipants" hint="Optional — leave blank for unlimited">
            <Input
              id="maxParticipants"
              type="number"
              min={1}
              value={values.maxParticipants}
              onChange={(e) => set('maxParticipants', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Status" htmlFor="status">
          <select
            id="status"
            value={values.status}
            onChange={(e) => set('status', e.target.value as EventStatus)}
            className="w-full rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="WhatsApp Message Template"
          htmlFor="messageTemplate"
          hint={'Placeholders: {{name}}, {{eventName}}, {{location}}, {{startDate}}, {{referenceNumber}}, or any form field label, e.g. {{Full Name}}'}
        >
          <textarea
            id="messageTemplate"
            value={values.messageTemplate}
            onChange={(e) => set('messageTemplate', e.target.value)}
            rows={3}
            className="w-full rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
          />
        </Field>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={isUploadingPoster}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </>
  );
}
