import { Field, Input, Textarea } from '@/components/ui/Input';
import type { EventFieldValue, EventFormFieldRecord } from '@/types/eventField';

interface FieldInputProps {
  field: EventFormFieldRecord;
  value: EventFieldValue | undefined;
  onChange: (value: EventFieldValue) => void;
  disabled?: boolean;
}

/** Renders the right input control for a dynamic event field, keyed by field_type.
 *  Shared between the public registration form and the admin response editor. */
export function FieldInput({ field, value, onChange, disabled }: FieldInputProps) {
  const label = `${field.label}${field.is_required ? ' *' : ''}`;

  switch (field.field_type) {
    case 'textarea':
      return (
        <Field label={label}>
          <Textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            required={field.is_required}
            disabled={disabled}
          />
        </Field>
      );
    case 'dropdown':
      return (
        <Field label={label}>
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.is_required}
            disabled={disabled}
            className="w-full rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue disabled:bg-table-head disabled:text-text-muted"
          >
            <option value="">Select…</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </Field>
      );
    case 'radio':
      return (
        <Field label={label}>
          <div className="space-y-1.5">
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="radio"
                  name={field.id}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  required={field.is_required}
                  disabled={disabled}
                  className="text-blue focus:ring-blue"
                />
                {opt}
              </label>
            ))}
          </div>
        </Field>
      );
    case 'checkbox': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <Field label={label}>
          <div className="space-y-1.5">
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={(e) =>
                    onChange(e.target.checked ? [...selected, opt] : selected.filter((o) => o !== opt))
                  }
                  disabled={disabled}
                  className="rounded text-blue focus:ring-blue"
                />
                {opt}
              </label>
            ))}
          </div>
        </Field>
      );
    }
    case 'item_list': {
      const entries = (value as Record<string, string>) ?? {};
      return (
        <Field label={label}>
          <div className="space-y-2 rounded-card border border-border p-3">
            {field.options?.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="w-1/2 truncate text-sm text-text-primary">{item}</span>
                <Input
                  value={entries[item] ?? ''}
                  onChange={(e) => onChange({ ...entries, [item]: e.target.value })}
                  required={field.is_required}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </Field>
      );
    }
    case 'file':
      return (
        <Field label={label} hint="File uploads aren't wired up yet">
          <Input type="file" disabled />
        </Field>
      );
    default:
      return (
        <Field label={label}>
          <Input
            type={field.field_type === 'number' ? 'number' : field.field_type}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.is_required}
            disabled={disabled}
          />
        </Field>
      );
  }
}
