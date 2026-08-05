import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Eye, MessageCircle, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { eventsApi } from '@/api/events.api';
import { eventResponsesApi } from '@/api/eventResponses.api';
import type { AdminResponseRow, EventResponsesListing } from '@/api/eventResponses.api';
import { responseStatusesApi } from '@/api/responseStatuses.api';
import { usersApi } from '@/api/users.api';
import { getApiErrorMessage } from '@/api/http';
import { ResponseDetailDrawer } from './ResponseDetailDrawer';
import { WhatsAppMessageModal } from './WhatsAppMessageModal';
import type { EventFieldValue, ItemListEntry } from '@/types/eventField';
import type { EventRecord } from '@/types/event';
import type { ResponseStatusRecord } from '@/types/responseStatus';
import type { UserRecord } from '@/types/user';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<AdminResponseRow | 'bulk' | null>(null);

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

  async function handleItemStatusChange(response: AdminResponseRow, itemId: string, statusId: string) {
    if (!id) return;
    const updated = await eventResponsesApi.setItemStatus(id, response.id, itemId, statusId || null);
    patchResponse(updated);
  }

  async function handleItemAssigneeChange(response: AdminResponseRow, itemId: string, userId: string) {
    if (!id) return;
    const updated = await eventResponsesApi.setItemAssignee(id, response.id, itemId, userId || null);
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

  function toggleSelected(responseId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(responseId)) next.delete(responseId);
      else next.add(responseId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === filteredResponses.length ? new Set() : new Set(filteredResponses.map((r) => r.id)),
    );
  }

  async function handleConfirmDelete() {
    if (!id || !deleteTarget) return;
    if (deleteTarget === 'bulk') {
      const ids = [...selectedIds];
      await eventResponsesApi.bulkRemove(id, ids);
      setListing((prev) => (prev ? { ...prev, responses: prev.responses.filter((r) => !selectedIds.has(r.id)) } : prev));
      setSelectedIds(new Set());
    } else {
      await eventResponsesApi.remove(id, deleteTarget.id);
      setListing((prev) => (prev ? { ...prev, responses: prev.responses.filter((r) => r.id !== deleteTarget.id) } : prev));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
    }
    setDeleteTarget(null);
  }

  const filteredResponses = useMemo(() => {
    if (!listing) return [];
    const q = search.trim().toLowerCase();
    return listing.responses.filter((response) => {
      if (statusFilter && response.status?.id !== statusFilter) return false;
      if (assigneeFilter && response.assignee?.id !== assigneeFilter) return false;
      if (!q) return true;
      const haystack = [
        response.referenceNumber,
        ...Object.values(response.values).map(formatCell),
        ...response.items.flatMap((i) => [i.itemLabel, i.value, ...i.codes]),
      ]
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
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <Button variant="destructive" onClick={() => setDeleteTarget('bulk')}>
              <Trash2 className="h-4 w-4" />
              Delete {selectedIds.size} selected
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} loading={isExporting} disabled={!listing?.responses.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
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

      {/* Table on wide screens — below `lg` the field-heavy table can't avoid
          horizontal scroll, so it's replaced by stacked cards instead. */}
      <div className="hidden overflow-x-auto rounded-card border border-border bg-white lg:block">
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
              <th className="whitespace-nowrap px-4 py-3">Reference #</th>
              <th className="whitespace-nowrap px-4 py-3">Item</th>
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="whitespace-nowrap px-4 py-3">Assigned To</th>
              {listing?.fields.map((field) => (
                <th key={field.id} className="whitespace-nowrap px-4 py-3">
                  {field.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3">Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {filteredResponses.map((response, index) => {
              const rowSpan = Math.max(response.items.length, 1);

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
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-muted" rowSpan={rowSpan}>
                      {response.referenceNumber}
                    </td>
                  </>
                );
              }

              function trailingCells() {
                return (
                  <>
                    {listing?.fields.map((field) => (
                      <td key={field.id} className="px-4 py-3 text-text-primary" rowSpan={rowSpan}>
                        {formatCell(response.values[field.id])}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-text-muted" rowSpan={rowSpan}>
                      {new Date(response.submittedAt).toLocaleString()}
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
                    {trailingCells()}
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
                  {itemIndex === 0 && trailingCells()}
                </tr>
              ));
            })}
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

      {/* Card list below `lg` — same data/actions as the table, no horizontal scroll. */}
      <div className="space-y-3 lg:hidden">
        {filteredResponses.map((response, index) => (
          <div key={response.id} className="rounded-card border border-border bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(response.id)}
                  onChange={() => toggleSelected(response.id)}
                  aria-label="Select response"
                  className="rounded text-blue focus:ring-blue"
                />
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
                <button
                  type="button"
                  onClick={() => setDeleteTarget(response)}
                  aria-label="Delete response"
                  className="text-text-faint hover:text-red"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-text-muted">#{index + 1}</p>
                <p className="font-mono text-xs text-text-muted">{response.referenceNumber}</p>
              </div>
            </div>

            <p className="mt-2 text-xs text-text-faint">{new Date(response.submittedAt).toLocaleString()}</p>

            {response.items.length === 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {response.status && <Badge tone={response.status.tone}>{response.status.name}</Badge>}
                <select
                  value={response.status?.id ?? ''}
                  onChange={(e) => handleStatusChange(response, e.target.value)}
                  className="rounded-card border border-border bg-white px-2 py-1 text-xs text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                >
                  <option value="">Status —</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
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
              </div>
            ) : (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {response.items.map((item) => (
                  <div key={item.id} className="rounded-card bg-table-head p-2">
                    <p className="text-sm text-text-primary">{item.itemLabel}</p>
                    <p className="text-xs text-text-muted">
                      {item.value}
                      {item.codes.length ? ` · ${item.codes.join(', ')}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {item.status && <Badge tone={item.status.tone}>{item.status.name}</Badge>}
                      <select
                        value={item.status?.id ?? ''}
                        onChange={(e) => handleItemStatusChange(response, item.id, e.target.value)}
                        className="rounded-card border border-border bg-white px-2 py-1 text-xs text-text-primary focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                      >
                        <option value="">Status —</option>
                        {statuses.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
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
                    </div>
                  </div>
                ))}
              </div>
            )}

            <dl className="mt-3 space-y-1.5 border-t border-border pt-3">
              {listing?.fields.map((field) => (
                <div key={field.id} className="flex justify-between gap-4 text-sm">
                  <dt className="text-text-muted">{field.label}</dt>
                  <dd className="text-right text-text-primary">{formatCell(response.values[field.id]) || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        {listing && listing.responses.length > 0 && filteredResponses.length === 0 && (
          <p className="rounded-card border border-border bg-white px-4 py-8 text-center text-sm text-text-muted">
            No responses match these filters.
          </p>
        )}
        {listing?.responses.length === 0 && (
          <p className="rounded-card border border-border bg-white px-4 py-8 text-center text-sm text-text-muted">
            No responses yet.
          </p>
        )}
        {listing === null && !error && (
          <p className="rounded-card border border-border bg-white px-4 py-8 text-center text-sm text-text-muted">
            Loading…
          </p>
        )}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget === 'bulk' ? `Delete ${selectedIds.size} responses?` : 'Delete this response?'}
        message="This can't be undone. The submitted answers will be permanently removed."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
