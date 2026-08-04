import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { eventsApi } from '@/api/events.api';
import { eventResponsesApi } from '@/api/eventResponses.api';
import type { AdminResponseRow, EventResponsesListing } from '@/api/eventResponses.api';
import { getApiErrorMessage } from '@/api/http';
import { ResponseDetailDrawer } from './ResponseDetailDrawer';
import { WhatsAppMessageModal } from './WhatsAppMessageModal';
import type { EventFieldValue } from '@/types/eventField';
import type { EventRecord } from '@/types/event';

function formatCell(value: EventFieldValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([item, v]) => `${item}: ${v}`)
      .join('; ');
  }
  return value;
}

export function EventResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [listing, setListing] = useState<EventResponsesListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<AdminResponseRow | null>(null);
  const [whatsAppResponse, setWhatsAppResponse] = useState<AdminResponseRow | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([eventsApi.get(id), eventResponsesApi.listForEvent(id)])
      .then(([e, l]) => {
        setEvent(e);
        setListing(l);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load responses')));
  }, [id]);

  async function handleExport() {
    if (!id || !event) return;
    setIsExporting(true);
    try {
      await eventResponsesApi.downloadCsv(id, `${event.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-responses.csv`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not export responses'));
    } finally {
      setIsExporting(false);
    }
  }

  if (error) return <p className="text-sm text-red">{error}</p>;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/admin/events')}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{event?.name ?? 'Loading…'}</h2>
          <p className="text-sm text-text-muted">
            {listing ? `${listing.responses.length} response${listing.responses.length === 1 ? '' : 's'}` : 'Loading…'}
            {event?.max_participants ? ` · limit ${event.max_participants}` : ''}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} loading={isExporting} disabled={!listing?.responses.length}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-table-head text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">Reference #</th>
              {listing?.fields.map((field) => (
                <th key={field.id} className="whitespace-nowrap px-4 py-3">
                  {field.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3">Submitted At</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {listing?.responses.map((response) => (
              <tr
                key={response.id}
                onClick={() => setSelectedResponse(response)}
                className="cursor-pointer border-t border-border hover:bg-table-head"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted">{response.referenceNumber}</td>
                {listing.fields.map((field) => (
                  <td key={field.id} className="px-4 py-3 text-text-primary">
                    {formatCell(response.values[field.id])}
                  </td>
                ))}
                <td className="px-4 py-3 text-text-muted">{new Date(response.submittedAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWhatsAppResponse(response);
                    }}
                    aria-label="Share on WhatsApp"
                    className="text-text-faint hover:text-green"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {listing?.responses.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No responses yet.</p>
        )}
        {listing === null && !error && <p className="px-4 py-8 text-center text-sm text-text-muted">Loading…</p>}
      </div>

      <ResponseDetailDrawer
        open={!!selectedResponse}
        eventId={id ?? ''}
        fields={listing?.fields ?? []}
        response={selectedResponse}
        onClose={() => setSelectedResponse(null)}
        onSaved={(updated) => {
          setSelectedResponse(updated);
          setListing((prev) =>
            prev
              ? { ...prev, responses: prev.responses.map((r) => (r.id === updated.id ? updated : r)) }
              : prev,
          );
        }}
      />

      {event && whatsAppResponse && (
        <WhatsAppMessageModal
          event={event}
          fields={listing?.fields ?? []}
          response={whatsAppResponse}
          onClose={() => setWhatsAppResponse(null)}
        />
      )}
    </div>
  );
}
