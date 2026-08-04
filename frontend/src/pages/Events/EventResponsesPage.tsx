import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Eye, MessageCircle, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { eventsApi } from '@/api/events.api';
import { eventResponsesApi } from '@/api/eventResponses.api';
import type { AdminResponseRow, EventResponsesListing } from '@/api/eventResponses.api';
import { responseStatusesApi } from '@/api/responseStatuses.api';
import { usersApi } from '@/api/users.api';
import { getApiErrorMessage } from '@/api/http';
import { ResponseDetailDrawer } from './ResponseDetailDrawer';
import { WhatsAppMessageModal } from './WhatsAppMessageModal';
import type { EventFieldValue } from '@/types/eventField';
import type { EventRecord } from '@/types/event';
import type { ResponseStatusRecord } from '@/types/responseStatus';
import type { UserRecord } from '@/types/user';

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
  const [statuses, setStatuses] = useState<ResponseStatusRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<AdminResponseRow | null>(null);
  const [drawerInitialEditing, setDrawerInitialEditing] = useState(false);
  const [whatsAppResponse, setWhatsAppResponse] = useState<AdminResponseRow | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([eventsApi.get(id), eventResponsesApi.listForEvent(id), responseStatusesApi.list(), usersApi.list()])
      .then(([e, l, s, u]) => {
        setEvent(e);
        setListing(l);
        setStatuses(s);
        setUsers(u);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load responses')));
  }, [id]);

  function patchResponse(updated: AdminResponseRow) {
    setListing((prev) =>
      prev ? { ...prev, responses: prev.responses.map((r) => (r.id === updated.id ? updated : r)) } : prev,
    );
  }

  async function handleStatusChange(response: AdminResponseRow, statusId: string) {
    if (!id) return;
    const updated = await eventResponsesApi.setStatus(id, response.id, statusId || null);
    patchResponse(updated);
  }

  async function handleAssigneeChange(response: AdminResponseRow, userId: string) {
    if (!id) return;
    const updated = await eventResponsesApi.setAssignee(id, response.id, userId || null);
    patchResponse(updated);
  }

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

  function openDrawer(response: AdminResponseRow, editing: boolean) {
    setSelectedResponse(response);
    setDrawerInitialEditing(editing);
  }

  const filteredResponses = useMemo(() => {
    if (!listing) return [];
    const q = search.trim().toLowerCase();
    return listing.responses.filter((response) => {
      if (statusFilter && response.status?.id !== statusFilter) return false;
      if (assigneeFilter && response.assignee?.id !== assigneeFilter) return false;
      if (!q) return true;
      const haystack = [response.referenceNumber, ...Object.values(response.values).map(formatCell)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [listing, statusFilter, assigneeFilter, search]);

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
            {listing
              ? `${filteredResponses.length} of ${listing.responses.length} response${listing.responses.length === 1 ? '' : 's'}`
              : 'Loading…'}
            {event?.max_participants ? ` · limit ${event.max_participants}` : ''}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} loading={isExporting} disabled={!listing?.responses.length}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference # or form values…"
            className="w-full rounded-card border border-border bg-white py-2 pl-9 pr-3 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
        >
          <option value="">All assignees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        {(statusFilter || assigneeFilter || search) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('');
              setAssigneeFilter('');
              setSearch('');
            }}
            className="text-sm font-medium text-blue hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-table-head text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-4 py-3">S.No</th>
              <th className="px-4 py-3" />
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="whitespace-nowrap px-4 py-3">Assigned To</th>
              <th className="whitespace-nowrap px-4 py-3">Reference #</th>
              {listing?.fields.map((field) => (
                <th key={field.id} className="whitespace-nowrap px-4 py-3">
                  {field.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3">Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {filteredResponses.map((response, index) => (
              <tr key={response.id} className="border-t border-border hover:bg-table-head">
                <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-start gap-3">
                    <button
                      type="button"
                      onClick={() => openDrawer(response, false)}
                      aria-label="View response"
                      className="text-text-faint hover:text-blue"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDrawer(response, true)}
                      aria-label="Edit response"
                      className="text-text-faint hover:text-blue"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhatsAppResponse(response)}
                      aria-label="Share on WhatsApp"
                      className="text-text-faint hover:text-green"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {response.status && <Badge tone={response.status.tone}>{response.status.name}</Badge>}
                    <select
                      value={response.status?.id ?? ''}
                      onChange={(e) => handleStatusChange(response, e.target.value)}
                      className="rounded-card border border-border bg-white px-2 py-1 text-xs text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                    >
                      <option value="">—</option>
                      {statuses.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={response.assignee?.id ?? ''}
                    onChange={(e) => handleAssigneeChange(response, e.target.value)}
                    className="rounded-card border border-border bg-white px-2 py-1 text-xs text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted">{response.referenceNumber}</td>
                {listing?.fields.map((field) => (
                  <td key={field.id} className="px-4 py-3 text-text-primary">
                    {formatCell(response.values[field.id])}
                  </td>
                ))}
                <td className="px-4 py-3 text-text-muted">{new Date(response.submittedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {listing && listing.responses.length > 0 && filteredResponses.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No responses match these filters.</p>
        )}
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
        initialEditing={drawerInitialEditing}
        onClose={() => setSelectedResponse(null)}
        onSaved={(updated) => {
          setSelectedResponse(updated);
          patchResponse(updated);
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
