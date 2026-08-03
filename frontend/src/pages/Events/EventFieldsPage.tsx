import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { eventsApi } from '@/api/events.api';
import { eventFieldsApi } from '@/api/eventFields.api';
import { getApiErrorMessage } from '@/api/http';
import { FieldFormDrawer } from './FieldFormDrawer';
import type { EventRecord } from '@/types/event';
import type { EventFormFieldRecord } from '@/types/eventField';

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  email: 'Email',
  dropdown: 'Dropdown',
  radio: 'Radio buttons',
  checkbox: 'Checkbox',
  date: 'Date',
  file: 'File upload',
  textarea: 'Textarea',
  item_list: 'Item List',
};

export function EventFieldsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [fields, setFields] = useState<EventFormFieldRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerField, setDrawerField] = useState<EventFormFieldRecord | 'new' | null>(null);

  function load() {
    if (!id) return;
    Promise.all([eventsApi.get(id), eventFieldsApi.list(id)])
      .then(([e, f]) => {
        setEvent(e);
        setFields(f);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load the form')));
  }

  useEffect(load, [id]);

  async function handleMove(index: number, direction: -1 | 1) {
    if (!id || !fields) return;
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const reordered = [...fields];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setFields(reordered);
    await eventFieldsApi.reorder(id, reordered.map((f) => f.id));
  }

  async function handleDelete(fieldId: string) {
    if (!id) return;
    await eventFieldsApi.remove(id, fieldId);
    setFields((f) => f?.filter((x) => x.id !== fieldId) ?? f);
  }

  function handleSaved(saved: EventFormFieldRecord) {
    setDrawerField(null);
    setFields((f) => {
      if (!f) return [saved];
      const exists = f.some((x) => x.id === saved.id);
      return exists ? f.map((x) => (x.id === saved.id ? saved : x)) : [...f, saved];
    });
  }

  return (
    <Drawer open onClose={() => navigate('/admin/events')} title={event?.name ?? 'Loading…'} widthClass="max-w-2xl">
      <div className="space-y-4">
        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Build the registration form public users will fill out for this event.
          </p>
          <Button onClick={() => setDrawerField('new')}>
            <Plus className="h-4 w-4" />
            Add Field
          </Button>
        </div>

        <div className="divide-y divide-border rounded-card border border-border bg-white">
          {fields?.map((field, index) => (
            <div key={field.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="text-text-faint hover:text-blue disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === fields.length - 1}
                  aria-label="Move down"
                  className="text-text-faint hover:text-blue disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-text-primary">{field.label}</span>
                  {field.is_required && <Badge tone="red">Required</Badge>}
                </div>
                <p className="text-xs text-text-muted">
                  {FIELD_TYPE_LABELS[field.field_type]}
                  {field.options?.length ? ` · ${field.options.join(', ')}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDrawerField(field)}
                aria-label="Edit field"
                className="text-text-faint hover:text-blue"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(field.id)}
                aria-label="Delete field"
                className="text-text-faint hover:text-red"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {fields?.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              No fields yet. Click "Add Field" to build the registration form.
            </p>
          )}
          {fields === null && !error && <p className="px-4 py-8 text-center text-sm text-text-muted">Loading…</p>}
        </div>

        {id && drawerField !== null && (
          <FieldFormDrawer
            key={drawerField === 'new' ? 'new' : drawerField.id}
            open={drawerField !== null}
            eventId={id}
            field={drawerField === 'new' ? undefined : drawerField}
            onClose={() => setDrawerField(null)}
            onSaved={handleSaved}
          />
        )}
      </div>
    </Drawer>
  );
}
