import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input } from '@/components/ui/Input';
import { responseStatusesApi } from '@/api/responseStatuses.api';
import { getApiErrorMessage } from '@/api/http';
import type { ResponseStatusRecord, ResponseStatusTone } from '@/types/responseStatus';

const TONE_OPTIONS: ResponseStatusTone[] = ['neutral', 'blue', 'green', 'amber', 'red'];

export function ResponseStatusesPage() {
  const [statuses, setStatuses] = useState<ResponseStatusRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tone, setTone] = useState<ResponseStatusTone>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function load() {
    responseStatusesApi
      .list()
      .then(setStatuses)
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load response statuses')));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await responseStatusesApi.create({ name: name.trim(), tone, order: statuses?.length ?? 0 });
      setName('');
      setTone('neutral');
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not create status'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToneChange(status: ResponseStatusRecord, newTone: ResponseStatusTone) {
    setStatuses((prev) => prev?.map((s) => (s.id === status.id ? { ...s, tone: newTone } : s)) ?? prev);
    await responseStatusesApi.update(status.id, { tone: newTone });
  }

  async function handleDelete(status: ResponseStatusRecord) {
    await responseStatusesApi.remove(status.id);
    setStatuses((prev) => prev?.filter((s) => s.id !== status.id) ?? prev);
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-text-muted">
        Global statuses admins can assign to any event's responses (e.g. Pending, Approved, Fulfilled).
      </p>

      {error && <p className="text-sm text-red">{error}</p>}

      <form onSubmit={handleCreate} className="flex items-end gap-3 rounded-card border border-border bg-white p-4">
        <Field label="Name" htmlFor="statusName">
          <Input id="statusName" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Color" htmlFor="statusTone">
          <select
            id="statusTone"
            value={tone}
            onChange={(e) => setTone(e.target.value as ResponseStatusTone)}
            className="rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
          >
            {TONE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" loading={isSubmitting}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>

      <div className="divide-y divide-border rounded-card border border-border bg-white">
        {statuses?.map((status) => (
          <div key={status.id} className="flex items-center gap-3 px-4 py-3">
            <Badge tone={status.tone}>{status.name}</Badge>
            <select
              value={status.tone}
              onChange={(e) => handleToneChange(status, e.target.value as ResponseStatusTone)}
              className="ml-auto rounded-card border border-border bg-white px-2 py-1 text-xs text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            >
              {TONE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleDelete(status)}
              aria-label="Delete status"
              className="text-text-faint hover:text-red"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {statuses?.length === 0 && <p className="px-4 py-8 text-center text-sm text-text-muted">No statuses yet.</p>}
        {statuses === null && !error && <p className="px-4 py-8 text-center text-sm text-text-muted">Loading…</p>}
      </div>
    </div>
  );
}
