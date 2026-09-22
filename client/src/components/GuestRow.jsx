import { MessageCircle, Bell, MoreHorizontal } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import RsvpButtons from './RsvpButtons.jsx';
import ConfirmedCountInput from './ConfirmedCountInput.jsx';
import { initials } from '../lib/format.js';
import { FUNCTION_STYLE, invitationFor } from '../lib/constants.js';

/// Desktop table row. In a function tab it shows that ceremony's numbers and
/// RSVP buttons; in the "All" tab it just shows which ceremonies they're on.
export default function GuestRow({
  guest, functionKey, selected, onSelect, onOpen, onRsvp, onCount, onWhatsApp, busy,
}) {
  const isAllTab = functionKey === 'ALL';
  const invitation = isAllTab ? null : invitationFor(guest, functionKey);

  // Guard: while a tab switch is still refetching, the previous list can briefly
  // contain guests who aren't on this ceremony's list.
  if (!isAllTab && !invitation) return null;

  return (
    <tr className={`border-b border-ink-100 last:border-0 ${selected ? 'bg-ink-50/70' : 'hover:bg-ink-50/40'}`}>
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(guest.id, event.target.checked)}
          className="checkbox"
          aria-label={`Select ${guest.name}`}
        />
      </td>

      <td className="py-3 pr-3">
        <button type="button" onClick={() => onOpen(guest)} className="flex items-center gap-3 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-600">
            {initials(guest.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink-900 hover:underline">
              {guest.name}
            </span>
            <span className="block truncate text-xs text-ink-400">
              {guest.code} · {guest.familyName || 'No family group'}
            </span>
          </span>
        </button>
      </td>

      <td className="py-3 pr-3">
        <a href={`tel:${guest.phone}`} className="text-sm tabular-nums text-ink-600 hover:underline">
          {guest.phone}
        </a>
      </td>

      {isAllTab ? (
        <td className="py-3 pr-3">
          <div className="flex flex-wrap gap-1">
            {guest.invitations.map((entry) => (
              <span
                key={entry.id}
                className={`badge ${FUNCTION_STYLE[entry.function.key]?.chip ?? 'bg-ink-100 text-ink-600'}`}
                title={`${entry.function.name}: ${entry.rsvpStatus}`}
              >
                {FUNCTION_STYLE[entry.function.key]?.short ?? entry.function.name}
                {entry.rsvpStatus === 'CONFIRMED' ? ` · ${entry.confirmedCount}` : ''}
              </span>
            ))}
          </div>
        </td>
      ) : (
        <>
          <td className="py-3 pr-3 text-center text-sm font-semibold tabular-nums text-ink-900">
            {invitation.invitedCount}
          </td>

          <td className="py-3 pr-3">
            {invitation.rsvpStatus === 'CONFIRMED' ? (
              <ConfirmedCountInput
                value={invitation.confirmedCount}
                max={invitation.invitedCount}
                busy={busy}
                onCommit={(count) => onCount(guest, count)}
              />
            ) : (
              <span className="text-sm text-ink-300">—</span>
            )}
          </td>
        </>
      )}

      <td className="py-3 pr-3">
        <div className="flex flex-col items-start gap-1">
          {!isAllTab && <StatusBadge kind="rsvp" value={invitation.rsvpStatus} />}
          <StatusBadge kind="invitation" value={guest.invitationStatus} />
        </div>
      </td>

      {!isAllTab && (
        <td className="py-3 pr-3">
          <RsvpButtons
            value={invitation.rsvpStatus}
            busy={busy}
            onChange={(status) => onRsvp(guest, status)}
          />
        </td>
      )}

      <td className="py-3 pr-3">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            className="btn-whatsapp btn-sm"
            onClick={() => onWhatsApp(guest, 'INVITATION')}
            title="Send WhatsApp invitation"
          >
            <MessageCircle size={14} />
          </button>
          {guest.invitationStatus === 'SENT' &&
            guest.invitations.some((entry) => entry.rsvpStatus === 'PENDING') && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => onWhatsApp(guest, 'REMINDER')}
                title="Send reminder"
              >
                <Bell size={14} />
              </button>
            )}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => onOpen(guest)}
            title="Guest details"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
