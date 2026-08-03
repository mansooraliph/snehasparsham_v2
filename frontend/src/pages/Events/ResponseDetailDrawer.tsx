import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { FieldInput } from '@/components/events/FieldInput';
import { eventResponsesApi } from '@/api/eventResponses.api';
import type { AdminResponseRow } from '@/api/eventResponses.api';
import { getApiErrorMessage } from '@/api/http';
import type { EventFieldValue, EventFormFieldRecord } from '@/types/eventField';

function formatCell(value: EventFieldValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([item, v]) => `${item}: ${v}`)
      .join('; ');
  }
  return value || '—';
}

interface ResponseDetailDrawerProps {
  open: boolean;
  eventId: string;
  fields: EventFormFieldRecord[];
  response: AdminResponseRow | null;
  onClose: () => void;
  onSaved: (response: AdminResponseRow) => void;
}

export function ResponseDetailDrawer({ open, eventId, fields, response, onClose, onSaved }: ResponseDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<Record<string, EventFieldValue>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (response) setValues(response.values);
    setIsEditing(false);
    setError(null);
  }, [response]);

  function resetAndClose() {
    setIsEditing(false);
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!response) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await eventResponsesApi.update(eventId, response.id, values);
      onSaved(saved);
      setIsEditing(false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save changes'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer open={open} onClose={resetAndClose} title="Response Details" widthClass="max-w-lg">
      {open && response && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Submitted {new Date(response.submittedAt).toLocaleString()}
          </p>

          <div className="space-y-4">
            {fields.map((field) =>
              isEditing ? (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={values[field.id]}
                  onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
                />
              ) : (
                <div key={field.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{field.label}</p>
                  <p className="mt-1 text-sm text-text-primary">{formatCell(response.values[field.id])}</p>
                </div>
              ),
            )}
          </div>

          {error && <p className="text-sm text-red">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setValues(response.values);
                    setIsEditing(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} loading={isSaving}>
                  Save Changes
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
