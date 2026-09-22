import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import FunctionPicker from './FunctionPicker.jsx';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

/// Editing an existing guest, including which ceremonies they're invited to.
export default function GuestFormModal({ open, guest, functions = [], onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', familyName: '', notes: '' });
  const [invitations, setInvitations] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!guest) return;
    setForm({
      name: guest.name ?? '',
      phone: guest.phone ?? '',
      familyName: guest.familyName ?? '',
      notes: guest.notes ?? '',
    });
    setInvitations(
      (guest.invitations ?? []).map((invitation) => ({
        functionKey: invitation.function.key,
        invitedCount: invitation.invitedCount,
      }))
    );
    setErrors({});
  }, [guest]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();

    if (invitations.length === 0) {
      setErrors({ invitations: 'Invite the guest to at least one function' });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const { guest: updated } = await api.updateGuest(guest.id, { ...form, invitations });
      toast.success('Guest updated.');
      onSaved(updated);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        setErrors(Object.fromEntries(error.details.map((d) => [d.field, d.message])));
      }
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit guest"
      subtitle={guest?.code}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="edit-guest-form" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="edit-guest-form" onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="edit-name">Full name</label>
          <input id="edit-name" className="input" value={form.name} onChange={set('name')} required />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="edit-phone">Mobile number</label>
            <input id="edit-phone" className="input" value={form.phone} onChange={set('phone')} inputMode="tel" required />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>
          <div>
            <label className="label" htmlFor="edit-family">Family / group</label>
            <input id="edit-family" className="input" value={form.familyName} onChange={set('familyName')} />
          </div>
        </div>

        <FunctionPicker
          functions={functions}
          value={invitations}
          onChange={(next) => {
            setInvitations(next);
            setErrors((current) => ({ ...current, invitations: undefined }));
          }}
          error={errors.invitations}
        />

        <div>
          <label className="label" htmlFor="edit-notes">Notes</label>
          <textarea id="edit-notes" rows={3} className="input resize-none" value={form.notes} onChange={set('notes')} />
        </div>
      </form>
    </Modal>
  );
}
