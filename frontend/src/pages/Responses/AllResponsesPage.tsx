import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, MessageCircle, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { responsesApi } from '@/api/responses.api';
import { eventResponsesApi } from '@/api/eventResponses.api';
import { eventsApi } from '@/api/events.api';
import { eventFieldsApi } from '@/api/eventFields.api';
import { usersApi } from '@/api/users.api';
import { responseStatusesApi } from '@/api/responseStatuses.api';
import { getApiErrorMessage } from '@/api/http';
import { ResponseDetailDrawer } from '@/pages/Events/ResponseDetailDrawer';
import { WhatsAppMessageModal } from '@/pages/Events/WhatsAppMessageModal';
import type { AdminResponseRow } from '@/api/eventResponses.api';
import type { CrossEventResponseRow, ResponseFilters } from '@/types/response';
import type { EventRecord } from '@/types/event';
import type { EventFieldValue, EventFormFieldRecord, ItemListEntry } from '@/types/eventField';
import type { ResponseStatusRecord } from '@/types/responseStatus';
import type { UserRecord } from '@/types/user';

const EMPTY_FILTERS: ResponseFilters = { eventId: '', assigneeId: '', dateFrom: '', dateTo: '' };

function formatCell(value: EventFieldValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, ItemListEntry>)
      .map(([item, entry]) => `${item}: ${entry.value}${entry.codes?.length ? ` [${entry.codes.join(', ')}]` : ''}`)
      .join('; ');
  }
  return value;
}

export function AllResponsesPage() {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<CrossEventResponseRow[] | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [statuses, setStatuses] = useState<ResponseStatusRecord[]>([]);
  const [filters, setFilters] = useState<ResponseFilters>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<CrossEventResponseRow | 'bulk' | null>(null);
  const [fieldsByEvent, setFieldsByEvent] = useState<Record<string, EventFormFieldRecord[]>>({});
  const [selectedResponse, setSelectedResponse] = useState<CrossEventResponseRow | null>(null);
  const [drawerInitialEditing, setDrawerInitialEditing] = useState(false);
  const [whatsAppResponse, setWhatsAppResponse] = useState<CrossEventResponseRow | null>(null);

  useEffect(() => {
    Promise.all([eventsApi.list(), usersApi.list(), responseStatusesApi.list()])
      .then(([e, u, s]) => {
        setEvents(e);
        setUsers(u);
        setStatuses(s);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load filters')));
  }, []);

  function load(f: ResponseFilters) {
    responsesApi
      .list(f)
      .then(setResponses)
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load responses')));
  }

  useEffect(() => load(filters), [filters]);

  // Fields aren't included on the cross-event row — load each represented event's
  // fields so the Name/Mobile column can be resolved for every visible response.
  useEffect(() => {
    if (!responses) return;
    const missing = [...new Set(responses.map((r) => r.event.id))].filter((id) => !(id in fieldsByEvent));
    if (missing.length) missing.forEach((id) => void ensureFields(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses]);

  function setFilter<K extends keyof ResponseFilters>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function patchResponse(id: string, patch: Partial<CrossEventResponseRow>) {
    setResponses((prev) => prev?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? prev);
  }

  async function handleStatusChange(row: CrossEventResponseRow, statusId: string) {
    const updated = await eventResponsesApi.setStatus(row.event.id, row.id, statusId || null);
    patchResponse(row.id, { status: updated.status });
  }

  async function handleAssigneeChange(row: CrossEventResponseRow, userId: string) {
    const updated = await eventResponsesApi.setAssignee(row.event.id, row.id, userId || null);
    patchResponse(row.id, { assignee: updated.assignee });
  }

  async function handleItemStatusChange(row: CrossEventResponseRow, itemId: string, statusId: string) {
    const updated = await eventResponsesApi.setItemStatus(row.event.id, row.id, itemId, statusId || null);
    patchResponse(row.id, { items: updated.items });
  }

  async function handleItemAssigneeChange(row: CrossEventResponseRow, itemId: string, userId: string) {
    const updated = await eventResponsesApi.setItemAssignee(row.event.id, row.id, itemId, userId || null);
    patchResponse(row.id, { items: updated.items });
  }

  async function ensureFields(eventId: string): Promise<EventFormFieldRecord[]> {
    const cached = fieldsByEvent[eventId];
    if (cached) return cached;
    const fields = await eventFieldsApi.list(eventId);
    setFieldsByEvent((prev) => ({ ...prev, [eventId]: fields }));
    return fields;
  }

  async function openDrawer(row: CrossEventResponseRow, editing: boolean) {
    await ensureFields(row.event.id);
    setSelectedResponse(row);
    setDrawerInitialEditing(editing);
  }

  async function openWhatsApp(row: CrossEventResponseRow) {
    await ensureFields(row.event.id);
    setWhatsAppResponse(row);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === filteredResponses.length ? new Set() : new Set(filteredResponses.map((r) => r.id)),
    );
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || !responses) return;
    if (deleteTarget === 'bulk') {
      const targets = responses.filter((r) => selectedIds.has(r.id));
      const byEvent = new Map<string, string[]>();
      for (const r of targets) byEvent.set(r.event.id, [...(byEvent.get(r.event.id) ?? []), r.id]);
      await Promise.all([...byEvent.entries()].map(([eventId, ids]) => eventResponsesApi.bulkRemove(eventId, ids)));
      setResponses((prev) => prev?.filter((r) => !selectedIds.has(r.id)) ?? prev);
      setSelectedIds(new Set());
    } else {
      await eventResponsesApi.remove(deleteTarget.event.id, deleteTarget.id);
      setResponses((prev) => prev?.filter((r) => r.id !== deleteTarget.id) ?? prev);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
    }
    setDeleteTarget(null);
  }

  const filteredResponses = useMemo(() => {
    if (!responses) return [];
    const q = search.trim().toLowerCase();
    if (!q) return responses;
    return responses.filter((r) => {
      const haystack = [r.referenceNumber, r.event.name, ...r.items.flatMap((i) => [i.itemLabel, i.value, ...i.codes])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [responses, search]);

  const hasActiveFilters = filters.eventId || filters.assigneeId || filters.dateFrom || filters.dateTo || search;

  // Name/mobile are the fields admins most often need at a glance — auto-detected
  // per event from field labels, same heuristic as the per-event responses page.
  function nameAndMobileFields(eventId: string) {
    const fields = fieldsByEvent[eventId] ?? [];
    return {
      nameField: fields.find((f) => /name/i.test(f.label)),
      mobileField: fields.find((f) => /mobile|phone/i.test(f.label)),
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">All responses submitted across every event.</p>
        {selectedIds.size > 0 && (
          <Button variant="destructive" onClick={() => setDeleteTarget('bulk')}>
            <Trash2 className="h-4 w-4" />
            Delete {selectedIds.size} selected
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-white p-4">
        <div className="relative min-w-[200px] flex-1">
          <Field label="Search" htmlFor="search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Reference # or event name…"
                className="w-full rounded-card border border-border bg-white py-2 pl-9 pr-3 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              />
            </div>
          </Field>
        </div>

        <Field label="Event" htmlFor="filterEvent">
          <select
            id="filterEvent"
            value={filters.eventId}
            onChange={(e) => setFilter('eventId', e.target.value)}
            className="rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
          >
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Assigned To" htmlFor="filterAssignee">
          <select
            id="filterAssignee"
            value={filters.assigneeId}
            onChange={(e) => setFilter('assigneeId', e.target.value)}
            className="rounded-card border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
          >
            <option value="">All assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="From" htmlFor="filterDateFrom">
          <Input
            id="filterDateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilter('dateFrom', e.target.value)}
          />
        </Field>

        <Field label="To" htmlFor="filterDateTo">
          <Input
            id="filterDateTo"
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom}
            onChange={(e) => setFilter('dateTo', e.target.value)}
          />
        </Field>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
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
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={filteredResponses.length > 0 && selectedIds.size === filteredResponses.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                  className="rounded text-blue focus:ring-blue"
                />
              </th>
              <th className="px-4 py-3">S.No</th>
              <th className="px-4 py-3" />
              <th className="px-4 py-3">Event / Reference #</th>
              <th className="whitespace-nowrap px-4 py-3">Name / Mobile</th>
              <th className="whitespace-nowrap px-4 py-3">Item</th>
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="whitespace-nowrap px-4 py-3">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {filteredResponses.map((response, index) => {
              const rowSpan = Math.max(response.items.length, 1);
              const { nameField, mobileField } = nameAndMobileFields(response.event.id);

              function sharedCells() {
                return (
                  <>
                    <td className="px-4 py-3" rowSpan={rowSpan}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(response.id)}
                        onChange={() => toggleSelected(response.id)}
                        aria-label="Select response"
                        className="rounded text-blue focus:ring-blue"
                      />
                    </td>
                    <td className="px-4 py-3 text-text-muted" rowSpan={rowSpan}>
                      {index + 1}
                    </td>
                    <td className="px-4 py-3" rowSpan={rowSpan}>
                      <div className="grid w-fit grid-cols-2 gap-2">
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
                          onClick={() => openWhatsApp(response)}
                          aria-label="Share on WhatsApp"
                          className="text-text-faint hover:text-green"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/events/${response.event.id}/responses`)}
                          aria-label="Open in event"
                          className="text-text-faint hover:text-blue"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(response)}
                          aria-label="Delete response"
                          className="text-text-faint hover:text-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" rowSpan={rowSpan}>
                      <p className="font-medium text-text-primary">{response.event.name}</p>
                      <p className="font-mono text-xs text-text-muted">{response.referenceNumber}</p>
                      <p className="text-xs text-text-faint">{new Date(response.submittedAt).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3 text-text-primary" rowSpan={rowSpan}>
                      {nameField && <p>{formatCell(response.values[nameField.id]) || '—'}</p>}
                      {mobileField && (
                        <p className="text-xs text-text-muted">{formatCell(response.values[mobileField.id]) || '—'}</p>
                      )}
                      {!nameField && !mobileField && <span className="text-text-faint">—</span>}
                    </td>
                  </>
                );
              }

              if (response.items.length === 0) {
                return (
                  <tr key={response.id} className="border-t border-border hover:bg-table-head">
                    {sharedCells()}
                    <td className="px-4 py-3 text-text-faint">—</td>
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
                  </tr>
                );
              }

              return response.items.map((item, itemIndex) => (
                <tr
                  key={item.id}
                  className={`border-border hover:bg-table-head ${itemIndex === 0 ? 'border-t-2' : 'border-t'}`}
                >
                  {itemIndex === 0 && sharedCells()}
                  <td className="px-4 py-3">
                    <p className="text-text-primary">{item.itemLabel}</p>
                    <p className="text-xs text-text-muted">
                      {item.value}
                      {item.codes.length ? ` · ${item.codes.join(', ')}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.status && <Badge tone={item.status.tone}>{item.status.name}</Badge>}
                      <select
                        value={item.status?.id ?? ''}
                        onChange={(e) => handleItemStatusChange(response, item.id, e.target.value)}
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
                      value={item.assignee?.id ?? ''}
                      onChange={(e) => handleItemAssigneeChange(response, item.id, e.target.value)}
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
                </tr>
              ));
            })}
          </tbody>
        </table>

        {responses && responses.length > 0 && filteredResponses.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No responses match these filters.</p>
        )}
        {responses?.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No responses yet.</p>
        )}
        {responses === null && !error && <p className="px-4 py-8 text-center text-sm text-text-muted">Loading…</p>}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget === 'bulk' ? `Delete ${selectedIds.size} responses?` : 'Delete this response?'}
        message="This can't be undone. The submitted answers will be permanently removed."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ResponseDetailDrawer
        open={!!selectedResponse}
        eventId={selectedResponse?.event.id ?? ''}
        fields={selectedResponse ? fieldsByEvent[selectedResponse.event.id] ?? [] : []}
        response={selectedResponse}
        initialEditing={drawerInitialEditing}
        onClose={() => setSelectedResponse(null)}
        onSaved={(updated: AdminResponseRow) => {
          patchResponse(updated.id, updated);
          setSelectedResponse((prev) => (prev ? { ...prev, ...updated } : prev));
        }}
      />

      {whatsAppResponse &&
        (() => {
          const whatsAppEvent = events.find((e) => e.id === whatsAppResponse.event.id);
          return whatsAppEvent ? (
            <WhatsAppMessageModal
              event={whatsAppEvent}
              fields={fieldsByEvent[whatsAppResponse.event.id] ?? []}
              response={whatsAppResponse}
              onClose={() => setWhatsAppResponse(null)}
            />
          ) : null;
        })()}
    </div>
  );
}
