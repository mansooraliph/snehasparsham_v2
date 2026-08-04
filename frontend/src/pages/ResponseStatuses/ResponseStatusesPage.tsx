import { useEffect, useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Check, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input } from '@/components/ui/Input';
import { responseStatusesApi } from '@/api/responseStatuses.api';
import { getApiErrorMessage } from '@/api/http';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ResponseStatusRecord, ResponseStatusTone } from '@/types/responseStatus';

const TONE_OPTIONS: ResponseStatusTone[] = ['neutral', 'blue', 'green', 'amber', 'red'];

export function ResponseStatusesPage() {
  // Admin-only (moved into Settings) — guards direct navigation too, e.g. a
  // bookmarked /admin/response-statuses link from before the move.
  const currentRole = useAuthStore((s) => s.user?.role);
  const [statuses, setStatuses] = useState<ResponseStatusRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tone, setTone] = useState<ResponseStatusTone>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTone, setEditTone] = useState<ResponseStatusTone>('neutral');
  const [isSaving, setIsSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  // Order at drag start — reorder() persists against this, not mid-drag snapshots,
  // so a drop always sends the full final order even after several reshuffles.
  const orderAtDragStart = useRef<ResponseStatusRecord[]>([]);

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

  function startEdit(status: ResponseStatusRecord) {
    setEditingId(status.id);
    setEditName(status.name);
    setEditTone(status.tone);
    setRowError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setRowError(null);
  }

  async function handleSaveEdit(status: ResponseStatusRecord) {
    setIsSaving(true);
    setRowError(null);
    try {
      const updated = await responseStatusesApi.update(status.id, { name: editName.trim(), tone: editTone });
      setStatuses((prev) => prev?.map((s) => (s.id === status.id ? updated : s)) ?? prev);
      setEditingId(null);
    } catch (err) {
      setRowError(getApiErrorMessage(err, 'Could not save changes'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(status: ResponseStatusRecord) {
    await responseStatusesApi.remove(status.id);
    setStatuses((prev) => prev?.filter((s) => s.id !== status.id) ?? prev);
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    setDraggedId(id);
    orderAtDragStart.current = statuses ?? [];
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, overId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;
    setStatuses((prev) => {
      if (!prev) return prev;
      const fromIndex = prev.findIndex((s) => s.id === draggedId);
      const toIndex = prev.findIndex((s) => s.id === overId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function handleDrop() {
    if (!draggedId || !statuses) return;
    setDraggedId(null);
    const changed = statuses.some((s, i) => s.id !== orderAtDragStart.current[i]?.id);
    if (!changed) return;
    try {
      await responseStatusesApi.reorder(statuses.map((s) => s.id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save the new order'));
      setStatuses(orderAtDragStart.current);
    }
  }

  if (currentRole !== undefined && currentRole !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-text-muted">
        Global statuses admins can assign to any event's responses (e.g. Pending, Approved, Fulfilled). Drag to reorder.
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
        {statuses?.map((status) =>
          editingId === status.id ? (
            <div key={status.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-3">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(status);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <select
                  value={editTone}
                  onChange={(e) => setEditTone(e.target.value as ResponseStatusTone)}
                  className="rounded-card border border-border bg-white px-2 py-1 text-xs text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                >
                  {TONE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(status)}
                  disabled={isSaving || !editName.trim()}
                  aria-label="Save"
                  className="text-text-faint hover:text-green disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" onClick={cancelEdit} aria-label="Cancel" className="text-text-faint hover:text-red">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {rowError && <p className="text-sm text-red">{rowError}</p>}
            </div>
          ) : (
            <div
              key={status.id}
              draggable
              onDragStart={(e) => handleDragStart(e, status.id)}
              onDragOver={(e) => handleDragOver(e, status.id)}
              onDrop={handleDrop}
              onDragEnd={() => setDraggedId(null)}
              className={`flex items-center gap-3 px-4 py-3 ${draggedId === status.id ? 'opacity-40' : ''}`}
            >
              <span className="cursor-grab text-text-faint active:cursor-grabbing" aria-hidden>
                <GripVertical className="h-4 w-4" />
              </span>
              <Badge tone={status.tone}>{status.name}</Badge>
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(status)}
                  aria-label="Edit status"
                  className="text-text-faint hover:text-blue"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(status)}
                  aria-label="Delete status"
                  className="text-text-faint hover:text-red"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ),
        )}
        {statuses?.length === 0 && <p className="px-4 py-8 text-center text-sm text-text-muted">No statuses yet.</p>}
        {statuses === null && !error && <p className="px-4 py-8 text-center text-sm text-text-muted">Loading…</p>}
      </div>
    </div>
  );
}
