import { useEffect, useState } from 'react';
import { MessageCircle, Bell, Pencil, Trash2 } from 'lucide-react';
import Modal from './Modal.jsx';
import StatusBadge from './StatusBadge.jsx';
import RsvpButtons from './RsvpButtons.jsx';
import ConfirmedCountInput from './ConfirmedCountInput.jsx';
import { LoadingState } from './States.jsx';
import { api } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { FUNCTION_STYLE } from '../lib/constants.js';

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink-900">{children}</dd>
    </div>
  );
}

export default function GuestDetailModal({
  open, guestId, onClose, onRsvp, onCount, onWhatsApp, onEdit, onDelete, busy,
}) {
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !guestId) return undefined;
    let cancelled = false;

    setLoading(true);
    api
      .getGuest(guestId)
      .then(({ guest: full }) => !cancelled && setGuest(full))
      .catch(() => !cancelled && setGuest(null))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [open, guestId, busy]);

  const hasPending = guest?.invitations?.some((entry) => entry.rsvpStatus === 'PENDING');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={guest?.name ?? 'Guest'}
      subtitle={guest ? `${guest.code} · ${guest.familyName || 'No family group'}` : undefined}
      size="lg"
      footer={
        guest && (
          <>
            <button type="button" className="btn-danger" onClick={() => onDelete(guest)}>
              <Trash2 size={15} /> Delete
            </button>
            <button type="button" className="btn-secondary" onClick={() => onEdit(guest)}>
              <Pencil size={15} /> Edit
            </button>
            {guest.invitationStatus === 'SENT' && hasPending && (
              <button
                type="button"
                className="btn-secondary col-span-2 sm:col-span-1"
                onClick={() => onWhatsApp(guest, 'REMINDER')}
              >
                <Bell size={15} /> Reminder
              </button>
            )}
            <button
              type="button"
              className="btn-whatsapp col-span-2 sm:col-span-1"
              onClick={() => onWhatsApp(guest, 'INVITATION')}
            >
              <MessageCircle size={15} /> Send WhatsApp
            </button>
          </>
        )
      }
    >
      {loading && !guest ? (
        <LoadingState />
      ) : !guest ? (
        <p className="py-8 text-center text-sm text-ink-500">Guest could not be loaded.</p>
      ) : (
        <div className="space-y-5">
          {/* One RSVP block per ceremony this guest is invited to. */}
          {guest.invitations.map((invitation) => (
            <div key={invitation.id} className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span
                  className={`badge ${FUNCTION_STYLE[invitation.function.key]?.chip ?? 'bg-ink-100 text-ink-600'}`}
                >
                  {invitation.function.name}
                </span>
                {invitation.function.time && (
                  <span className="text-xs text-ink-400">{invitation.function.time}</span>
                )}
                <span className="text-xs text-ink-400">· {invitation.invitedCount} invited</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <RsvpButtons
                  value={invitation.rsvpStatus}
                  busy={busy}
                  onChange={(status) => onRsvp(guest, status, {}, invitation.function.key)}
                />

                {invitation.rsvpStatus === 'CONFIRMED' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-ink-500">People coming</span>
                    <ConfirmedCountInput
                      value={invitation.confirmedCount}
                      max={invitation.invitedCount}
                      busy={busy}
                      onCommit={(count) => onCount(guest, count, invitation.function.key)}
                    />
                    <span className="text-xs text-ink-400">of {invitation.invitedCount}</span>
                  </div>
                )}
              </div>

              {invitation.rsvpReceivedAt && (
                <p className="mt-2 text-xs text-ink-400">
                  Replied {formatDateTime(invitation.rsvpReceivedAt)}
                </p>
              )}
            </div>
          ))}

          {/* Contact details */}
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Mobile">
              <a href={`tel:${guest.phone}`} className="hover:underline">{guest.phone}</a>
            </Field>
            <Field label="Family / group">{guest.familyName || '—'}</Field>
            <Field label="Invitation"><StatusBadge kind="invitation" value={guest.invitationStatus} /></Field>
            <Field label="Invitation sent">{formatDateTime(guest.invitationSentAt)}</Field>
            <Field label="Last reminder">{formatDateTime(guest.lastReminderAt)}</Field>
          </dl>

          {guest.notes && (
            <div>
              <p className="text-xs text-ink-400">Notes</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl bg-ink-50 p-3 text-sm text-ink-700">
                {guest.notes}
              </p>
            </div>
          )}

          {guest.rsvpResponses?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                RSVP history
              </p>
              <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
                {guest.rsvpResponses.map((response) => (
                  <li key={response.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="flex items-center gap-2">
                      <StatusBadge kind="rsvp" value={response.status} />
                      <span className="text-xs text-ink-500">
                        {response.invitation?.function?.name}
                      </span>
                    </span>
                    <span className="text-xs text-ink-400">
                      {response.confirmedCount != null && `${response.confirmedCount} ppl · `}
                      {formatDateTime(response.respondedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {guest.invitationLogs?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Messages sent
              </p>
              <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
                {guest.invitationLogs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-xs font-medium text-ink-700">
                      {log.templateKey === 'REMINDER' ? 'Reminder' : 'Invitation'}
                    </span>
                    <span className="text-xs text-ink-400">{formatDateTime(log.sentAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
