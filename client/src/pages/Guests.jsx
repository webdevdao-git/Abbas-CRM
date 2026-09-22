import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Download, UserPlus, Send, Trash2, X, Users, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { FILTERS } from '../lib/constants.js';
import { sendWhatsApp } from '../lib/whatsapp.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import GuestRow from '../components/GuestRow.jsx';
import GuestCard from '../components/GuestCard.jsx';
import GuestDetailModal from '../components/GuestDetailModal.jsx';
import GuestFormModal from '../components/GuestFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { LoadingState, EmptyState, ErrorState } from '../components/States.jsx';

const PAGE_SIZE = 50;

export default function Guests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [filter, setFilter] = useState(searchParams.get('filter') ?? 'ALL');
  const [functionKey, setFunctionKey] = useState(searchParams.get('function') ?? 'ENGAGEMENT');
  const [functions, setFunctions] = useState([]);
  const [page, setPage] = useState(1);

  const [guests, setGuests] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [selected, setSelected] = useState(() => new Set());
  const [detailId, setDetailId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [working, setWorking] = useState(false);

  const abortRef = useRef(null);

  // Debounce typing so hundreds of guests don't mean a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // The ceremonies are configurable, so the tabs come from the API.
  useEffect(() => {
    api
      .getEvent()
      .then((data) => setFunctions(data.functions))
      .catch(() => setFunctions([]));
  }, []);

  // Keep the URL shareable/bookmarkable.
  useEffect(() => {
    const next = {};
    if (debouncedSearch) next.search = debouncedSearch;
    if (filter !== 'ALL') next.filter = filter;
    if (functionKey !== 'ENGAGEMENT') next.function = functionKey;
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, filter, functionKey, setSearchParams]);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await api.listGuests(
        { search: debouncedSearch, filter, function: functionKey, page, pageSize: PAGE_SIZE },
        controller.signal
      );
      setGuests(data.guests);
      setPagination(data.pagination);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, filter, functionKey, page]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  // --------------------------------------------------------- mutations

  const replaceGuest = (updated) =>
    setGuests((current) => current.map((g) => (g.id === updated.id ? updated : g)));

  const handleRsvp = async (guest, status, extra = {}, overrideKey) => {
    const key = overrideKey ?? functionKey;
    setBusyId(guest.id);
    try {
      const { guest: updated } = await api.setRsvp(guest.id, { functionKey: key, status, ...extra });
      replaceGuest(updated);
      // A filtered view may no longer contain this guest.
      if (filter !== 'ALL') load();
      toast.success(`${guest.name} marked ${status.replace('_', ' ').toLowerCase()}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCount = async (guest, confirmedCount, overrideKey) => {
    setBusyId(guest.id);
    try {
      const { guest: updated } = await api.setRsvp(guest.id, {
        functionKey: overrideKey ?? functionKey,
        status: 'CONFIRMED',
        confirmedCount,
      });
      replaceGuest(updated);
      toast.success(`${guest.name}: ${confirmedCount} people confirmed.`);
    } catch (err) {
      toast.error(err.message);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const handleWhatsApp = async (guest, templateKey) => {
    setBusyId(guest.id);
    try {
      const updated = await sendWhatsApp(guest, templateKey);
      replaceGuest(updated);
      toast.success(
        templateKey === 'REMINDER'
          ? 'Reminder opened in WhatsApp.'
          : 'Invitation opened in WhatsApp. Send your card in the same chat.'
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    setWorking(true);
    try {
      await api.deleteGuest(deleting.id);
      toast.success(`${deleting.name} deleted.`);
      setDeleting(null);
      setDetailId(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  // --------------------------------------------------------- selection

  const activeFunction = functions.find((fn) => fn.key === functionKey);
  const selectedIds = useMemo(() => [...selected], [selected]);
  const allOnPageSelected = guests.length > 0 && guests.every((g) => selected.has(g.id));

  const toggleOne = (id, checked) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (checked) =>
    setSelected((current) => {
      const next = new Set(current);
      guests.forEach((g) => (checked ? next.add(g.id) : next.delete(g.id)));
      return next;
    });

  const downloadCsv = async (ids) => {
    try {
      const blob = await api.exportCsv({ ids, functionKey });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `guests-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const bulkMarkInvited = async () => {
    setWorking(true);
    try {
      const { updated } = await api.bulkMarkInvited(selectedIds);
      toast.success(`${updated} guest${updated === 1 ? '' : 's'} marked as invited.`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const bulkDelete = async () => {
    setWorking(true);
    try {
      const { deleted } = await api.bulkDelete(selectedIds);
      toast.success(`${deleted} guest${deleted === 1 ? '' : 's'} deleted.`);
      setSelected(new Set());
      setBulkDeleting(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const rowProps = {
    functionKey,
    onSelect: toggleOne,
    onOpen: (guest) => setDetailId(guest.id),
    onRsvp: handleRsvp,
    onCount: handleCount,
    onWhatsApp: handleWhatsApp,
  };

  return (
    <>
      <PageHeader
        title="Guests"
        subtitle={
          functionKey === 'ALL'
            ? `${pagination.total} ${pagination.total === 1 ? 'person' : 'people'} on the contact list`
            : `${pagination.total} guest${pagination.total === 1 ? '' : 's'} invited to ${
                activeFunction?.name ?? 'this function'
              }`
        }
        actions={
          <>
            <button type="button" className="btn-secondary btn-sm" onClick={() => downloadCsv()}>
              <Download size={15} /> Export CSV
            </button>
            <Link
              to={`/guests/new${functionKey !== 'ALL' ? `?function=${functionKey}` : ''}`}
              className="btn-primary btn-sm"
            >
              <UserPlus size={15} /> Add guest
            </Link>
          </>
        }
      />

      {/* Engagement and DAREES are separate lists; this switches between them. */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {[...functions, { key: 'ALL', name: 'All guests' }].map((fn) => (
          <button
            key={fn.key}
            type="button"
            onClick={() => {
              if (fn.key === functionKey) return;
              setFunctionKey(fn.key);
              setPage(1);
              setSelected(new Set());
              setGuests([]);
            }}
            className={`min-h-[44px] shrink-0 rounded-xl border px-4 text-sm font-semibold transition-colors sm:min-h-0 sm:py-2.5 ${
              functionKey === fn.key
                ? 'border-ink-900 bg-ink-900 text-white'
                : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
            }`}
          >
            {fn.name}
            {/* The time makes the tabs too wide to fit on a phone. */}
            {fn.time && (
              <span
                className={`ml-2 hidden text-xs font-medium sm:inline ${
                  functionKey === fn.key ? 'text-white/60' : 'text-ink-400'
                }`}
              >
                {fn.time}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="card mb-4 p-3 sm:p-4">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, mobile or family…"
            className="input pl-10"
            aria-label="Search guests"
          />
        </div>

        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setFilter(option.value);
                setPage(1);
              }}
              className={`min-h-[40px] shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 ${
                filter === option.value
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
          <span className="mr-auto text-sm font-semibold text-ink-900">
            {selectedIds.length} selected
          </span>
          <button type="button" className="btn-secondary btn-sm" onClick={bulkMarkInvited} disabled={working}>
            <Send size={14} /> Mark invitation sent
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => downloadCsv(selectedIds)} disabled={working}>
            <Download size={14} /> Export selected
          </button>
          <button type="button" className="btn-danger btn-sm" onClick={() => setBulkDeleting(true)} disabled={working}>
            <Trash2 size={14} /> Delete
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
            <X size={14} /> Clear
          </button>
        </div>
      )}

      {/* List */}
      {loading && guests.length === 0 ? (
        <div className="card"><LoadingState label="Loading guests…" /></div>
      ) : error ? (
        <div className="card"><ErrorState message={error} onRetry={load} /></div>
      ) : guests.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title={
              debouncedSearch || filter !== 'ALL'
                ? 'No guests match this view'
                : functionKey === 'ALL'
                  ? 'No guests yet'
                  : `No guests invited to ${activeFunction?.name ?? 'this function'} yet`
            }
            message={
              debouncedSearch || filter !== 'ALL'
                ? 'Try a different search term or filter.'
                : 'Add your first guest, then send the invitation on WhatsApp.'
            }
            action={
              debouncedSearch || filter !== 'ALL' ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setSearch('');
                    setFilter('ALL');
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link to="/guests/new" className="btn-primary btn-sm">
                  <UserPlus size={15} /> Add guest
                </Link>
              )
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {guests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                selected={selected.has(guest.id)}
                busy={busyId === guest.id}
                {...rowProps}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className={`w-full ${functionKey === 'ALL' ? 'min-w-[820px]' : 'min-w-[1000px]'}`}>
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50/60 text-left">
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={(event) => toggleAll(event.target.checked)}
                        className="checkbox"
                        aria-label="Select all on this page"
                      />
                    </th>
                    <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Guest</th>
                    <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Mobile</th>
                    {functionKey === 'ALL' ? (
                      <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Invited to</th>
                    ) : (
                      <>
                        <th className="py-3 pr-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-500">Invited</th>
                        <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Confirmed</th>
                      </>
                    )}
                    <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
                    {functionKey !== 'ALL' && (
                      <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Set RSVP</th>
                    )}
                    <th className="py-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((guest) => (
                    <GuestRow
                      key={guest.id}
                      guest={guest}
                      selected={selected.has(guest.id)}
                      busy={busyId === guest.id}
                      {...rowProps}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <span className="text-sm text-ink-500">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <GuestDetailModal
        open={Boolean(detailId)}
        guestId={detailId}
        busy={busyId !== null}
        onClose={() => setDetailId(null)}
        onRsvp={handleRsvp}
        onCount={handleCount}
        onWhatsApp={handleWhatsApp}
        onEdit={(guest) => {
          setDetailId(null);
          setEditing(guest);
        }}
        onDelete={(guest) => setDeleting(guest)}
      />

      <GuestFormModal
        open={Boolean(editing)}
        guest={editing}
        functions={functions}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          replaceGuest(updated);
          load();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={working}
        title="Delete this guest?"
        message={`${deleting?.name} and their RSVP history will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete guest"
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={bulkDeleting}
        busy={working}
        title={`Delete ${selectedIds.length} guests?`}
        message="All selected guests and their RSVP history will be permanently removed. This cannot be undone."
        confirmLabel={`Delete ${selectedIds.length} guests`}
        onClose={() => setBulkDeleting(false)}
        onConfirm={bulkDelete}
      />
    </>
  );
}
