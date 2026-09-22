import { MessageCircle, Bell, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import RsvpButtons from './RsvpButtons.jsx';
import ConfirmedCountInput from './ConfirmedCountInput.jsx';
import { initials } from '../lib/format.js';
import { FUNCTION_STYLE, invitationFor } from '../lib/constants.js';

/// Mobile card. Everything reachable with one thumb.
export default function GuestCard({
  guest, functionKey, selected, onSelect, onOpen, onRsvp, onCount, onWhatsApp, busy,
}) {
  const isAllTab = functionKey === 'ALL';
  const invitation = isAllTab ? null : invitationFor(guest, functionKey);
  const hasPending = guest.invitations.some((entry) => entry.rsvpStatus === 'PENDING');

  // Guard: while a tab switch is still refetching, the previous list can briefly
  // contain guests who aren't on this ceremony's list.
  if (!isAllTab && !invitation) return null;

  return (
    <div className={`card p-4 ${selected ? 'ring-2 ring-ink-900/10' : ''}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(guest.id, event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-ink-300 text-ink-900 focus:ring-ink-900/20"
          aria-label={`Select ${guest.name}`}
        />

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-600">
          {initials(guest.name)}
        </span>

        <button type="button" onClick={() => onOpen(guest)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-ink-900">{guest.name}</p>
          <p className="truncate text-xs text-ink-400">
            {guest.code} · {guest.familyName || 'No family group'}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-ink-500">{guest.phone}</p>
        </button>

        <button
          type="button"
          onClick={() => onOpen(guest)}
          className="-m-1 p-1 text-ink-300"
          aria-label="Guest details"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {isAllTab ? (
          guest.invitations.map((entry) => (
            <span
              key={entry.id}
              className={`badge ${FUNCTION_STYLE[entry.function.key]?.chip ?? 'bg-ink-100 text-ink-600'}`}
            >
              {FUNCTION_STYLE[entry.function.key]?.short ?? entry.function.name}
              {entry.rsvpStatus === 'CONFIRMED' ? ` · ${entry.confirmedCount} coming` : ''}
            </span>
          ))
        ) : (
          <>
            <StatusBadge kind="rsvp" value={invitation.rsvpStatus} />
            <span className="badge bg-ink-100 text-ink-600">
              {invitation.rsvpStatus === 'CONFIRMED'
                ? `${invitation.confirmedCount} of ${invitation.invitedCount} coming`
                : `${invitation.invitedCount} invited`}
            </span>
          </>
        )}
        <StatusBadge kind="invitation" value={guest.invitationStatus} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {!isAllTab && (
          <RsvpButtons
            value={invitation.rsvpStatus}
            busy={busy}
            onChange={(status) => onRsvp(guest, status)}
          />
        )}

        <div className="flex items-center gap-1.5">
          {!isAllTab && invitation.rsvpStatus === 'CONFIRMED' && (
            <ConfirmedCountInput
              value={invitation.confirmedCount}
              max={invitation.invitedCount}
              busy={busy}
              onCommit={(count) => onCount(guest, count)}
            />
          )}
          {guest.invitationStatus === 'SENT' && hasPending && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => onWhatsApp(guest, 'REMINDER')}
              title="Send reminder"
            >
              <Bell size={14} />
            </button>
          )}
          <button type="button" className="btn-whatsapp btn-sm" onClick={() => onWhatsApp(guest, 'INVITATION')}>
            <MessageCircle size={14} /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
