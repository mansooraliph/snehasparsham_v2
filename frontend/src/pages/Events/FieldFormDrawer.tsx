import { useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { eventFieldsApi } from '@/api/eventFields.api';
import { getApiErrorMessage } from '@/api/http';
import { OPTIONS_REQUIRED_FIELD_TYPES } from '@/types/eventField';
import type { EventFieldType, EventFormFieldRecord, ItemSerialConfigInput } from '@/types/eventField';

const EMPTY_SERIAL: ItemSerialConfigInput = { enabled: false, prefix: '', start: 1 };

const FIELD_TYPE_OPTIONS: { value: EventFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'dropdown', label: 'Dropdown / Select' },
  { value: 'radio', label: 'Radio buttons' },
  { value: 'checkbox', label: 'Checkbox (multi-select)' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File upload' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'item_list', label: 'Item List (value per item)' },
];

interface FieldFormDrawerProps {
  open: boolean;
  eventId: string;
  field?: EventFormFieldRecord;
  onClose: () => void;
  onSaved: (field: EventFormFieldRecord) => void;
}

export function FieldFormDrawer({ open, eventId, field, onClose, onSaved }: FieldFormDrawerProps) {
  const isEdit = !!field;
  const [label, setLabel] = useState(field?.label ?? '');
  const [fieldType, setFieldType] = useState<EventFieldType>(field?.field_type ?? 'text');
  const [isRequired, setIsRequired] = useState(field?.is_required ?? false);
  const [options, setOptions] = useState<string[]>(field?.options?.length ? field.options : ['']);
  const [itemSerial, setItemSerial] = useState<ItemSerialConfigInput[]>(
    field?.options?.length
      ? field.options.map((_, i) => field.item_serial_config?.[i] ?? EMPTY_SERIAL)
      : [EMPTY_SERIAL],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsOptions = OPTIONS_REQUIRED_FIELD_TYPES.includes(fieldType);
  const isItemList = fieldType === 'item_list';

  function addOption() {
    setOptions((o) => [...o, '']);
    setItemSerial((s) => [...s, { ...EMPTY_SERIAL }]);
  }

  function removeOption(i: number) {
    setOptions((o) => o.filter((_, idx) => idx !== i));
    setItemSerial((s) => s.filter((_, idx) => idx !== i));
  }

  function updateSerial(i: number, patch: Partial<ItemSerialConfigInput>) {
    setItemSerial((s) => s.map((cfg, idx) => (idx === i ? { ...cfg, ...patch } : cfg)));
  }

  function resetAndClose() {
    setLabel('');
    setFieldType('text');
    setIsRequired(false);
    setOptions(['']);
    setItemSerial([{ ...EMPTY_SERIAL }]);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    try {
      const input = {
        label: label.trim(),
        fieldType,
        isRequired,
        options: needsOptions ? cleanOptions : undefined,
        itemSerialConfig: isItemList
          ? options.flatMap((o, i) => (o.trim() ? [itemSerial[i] ?? EMPTY_SERIAL] : []))
          : undefined,
      };
      const saved = isEdit
        ? await eventFieldsApi.update(eventId, field!.id, input)
        : await eventFieldsApi.create(eventId, input);
      onSaved(saved);
      resetAndClose();
    } catch (err) {
      setError(getApiErrorMessage(err, isEdit ? 'Could not update field' : 'Could not add field'));
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onClose={resetAndClose} title={isEdit ? 'Edit Field' : 'Add Field'} widthClass="max-w-md">
      {open && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Label" htmlFor="field-label">
            <Input id="field-label" value={label} onChange={(e) => setLabel(e.target.value)} required />
          </Field>

          <Field label="Field Type" htmlFor="field-type">
            <select
              id="field-type"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as EventFieldType)}
              className="w-full rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            >
              {FIELD_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          {needsOptions && (
            <Field
              label={isItemList ? 'Items' : 'Options'}
              htmlFor="field-options"
              hint={isItemList ? 'One item per row — the responder enters a value against each' : 'One per row'}
            >
              <div className="space-y-3">
                {options.map((opt, i) => {
                  const serial = itemSerial[i] ?? EMPTY_SERIAL;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => setOptions((o) => o.map((v, idx) => (idx === i ? e.target.value : v)))}
                          placeholder={isItemList ? `Item ${i + 1}` : `Option ${i + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          aria-label="Remove item"
                          className="shrink-0 text-text-faint hover:text-red"
                          disabled={options.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {isItemList && (
                        <div className="ml-1 flex flex-wrap items-center gap-3 rounded-card bg-table-head/50 px-3 py-2">
                          <label className="flex items-center gap-1.5 text-xs text-text-primary">
                            <input
                              type="checkbox"
                              checked={serial.enabled}
                              onChange={(e) => updateSerial(i, { enabled: e.target.checked })}
                              className="h-3.5 w-3.5 rounded border-border text-blue focus:ring-blue"
                            />
                            Auto Serial Number
                          </label>
                          {serial.enabled && (
                            <>
                              <input
                                value={serial.prefix ?? ''}
                                onChange={(e) => updateSerial(i, { prefix: e.target.value })}
                                placeholder="Prefix (e.g. RB-)"
                                className="w-32 rounded-card border border-border bg-white px-2 py-1 text-xs text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                              />
                              <input
                                type="number"
                                min={1}
                                value={serial.start ?? 1}
                                onChange={(e) => updateSerial(i, { start: Math.max(1, Number(e.target.value) || 1) })}
                                placeholder="Start #"
                                className="w-20 rounded-card border border-border bg-white px-2 py-1 text-xs text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-1 text-sm font-medium text-blue hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isItemList ? 'Add item' : 'Add option'}
                </button>
              </div>
            </Field>
          )}

          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-4 w-4 rounded border-border text-blue focus:ring-blue"
            />
            Required field
          </label>

          {error && <p className="text-sm text-red">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Field'}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
