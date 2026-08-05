import { useMemo, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { renderTemplate, DEFAULT_MESSAGE_TEMPLATE } from '@/lib/utils/messageTemplate';
import { buildWhatsAppLink } from '@/lib/utils/whatsapp';
import type { AdminResponseRow } from '@/api/eventResponses.api';
import type { EventRecord } from '@/types/event';
import type { EventFieldValue, EventFormFieldRecord, ItemListEntry } from '@/types/eventField';

function valueToString(value: EventFieldValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, ItemListEntry>)
      .map(([item, entry]) => `${item}: ${entry.value}${entry.codes?.length ? ` [${entry.codes.join(', ')}]` : ''}`)
      .join(', ');
  }
  return value;
}

interface WhatsAppMessageModalProps {
  event: EventRecord;
  fields: EventFormFieldRecord[];
  response: AdminResponseRow;
  onClose: () => void;
}

export function WhatsAppMessageModal({ event, fields, response, onClose }: WhatsAppMessageModalProps) {
  const { context, phone } = useMemo(() => {
    const ctx: Record<string, string> = {
      eventName: event.name,
      location: event.location,
      startDate: event.start_date,
      referenceNumber: response.referenceNumber,
    };

    let nameValue = '';
    let phoneValue: string | null = null;
    for (const field of fields) {
      const raw = valueToString(response.values[field.id]);
      ctx[field.label] = raw;
      if (!nameValue && /name/i.test(field.label)) nameValue = raw;
      if (!phoneValue && (field.field_type === 'number' || field.field_type === 'text') && /phone|mobile|whatsapp/i.test(field.label)) {
        phoneValue = raw;
      }
    }
    ctx.name = nameValue;

    return { context: ctx, phone: phoneValue };
  }, [event, fields, response]);

  const [message, setMessage] = useState(() => renderTemplate(event.message_template || DEFAULT_MESSAGE_TEMPLATE, context));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-card bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">WhatsApp Message</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {phone ? (
          <p className="mb-3 text-sm text-text-muted">To: {phone}</p>
        ) : (
          <p className="mb-3 text-sm text-amber">
            No phone number found on this response — WhatsApp will open its contact picker instead.
          </p>
        )}

        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={10} />

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => window.open(buildWhatsAppLink(phone, message), '_blank', 'noopener,noreferrer')}>
            <MessageCircle className="h-4 w-4" />
            Share on WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
