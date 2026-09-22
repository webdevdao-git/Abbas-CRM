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
        <label className="-m-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center sm:m-0 sm:h-auto sm:w-auto">
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelect(guest.id, event.target.checked)}
            className="checkbox"
            aria-label={`Select ${guest.name}`}
          />
        </label>

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
          className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center text-ink-300"
          aria-label="Guest details"
        >
          <ChevronRight size={20} />
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

      {/* On a phone the RSVP control gets a full row of its own, so the three
          choices stay wide enough to hit with a thumb. */}
      {!isAllTab && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RsvpButtons
            value={invitation.rsvpStatus}
            busy={busy}
            onChange={(status) => onRsvp(guest, status)}
          />
          {invitation.rsvpStatus === 'CONFIRMED' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-500 sm:hidden">People coming</span>
              <ConfirmedCountInput
                value={invitation.confirmedCount}
                max={invitation.invitedCount}
                busy={busy}
                onCommit={(count) => onCount(guest, count)}
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        {guest.invitationStatus === 'SENT' && hasPending && (
          <button
            type="button"
            className="btn-secondary btn-sm btn-icon"
            onClick={() => onWhatsApp(guest, 'REMINDER')}
            aria-label="Send reminder"
            title="Send reminder"
          >
            <Bell size={16} />
          </button>
        )}
        <button
          type="button"
          className="btn-whatsapp btn-sm flex-1 sm:flex-none"
          onClick={() => onWhatsApp(guest, 'INVITATION')}
        >
          <MessageCircle size={16} /> WhatsApp
        </button>
      </div>
    </div>
  );
}
