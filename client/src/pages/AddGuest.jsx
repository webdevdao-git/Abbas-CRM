import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Check } from 'lucide-react';
import { api, ApiError } from '../lib/api.js';
import { sendWhatsApp } from '../lib/whatsapp.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import FunctionPicker from '../components/FunctionPicker.jsx';
import { LoadingState } from '../components/States.jsx';

export default function AddGuest() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ name: '', phone: '', familyName: '', notes: '' });
  const [invitations, setInvitations] = useState([]);
  const [functions, setFunctions] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // Pre-tick whichever list the admin came from.
  useEffect(() => {
    api
      .getEvent()
      .then(({ functions: list }) => {
        setFunctions(list);
        const fromTab = searchParams.get('function');
        const preset = list.find((fn) => fn.key === fromTab) ?? list[0];
        if (preset) setInvitations([{ functionKey: preset.key, invitedCount: 1 }]);
      })
      .catch((error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event, andSend = false) => {
    event.preventDefault();

    if (invitations.length === 0) {
      setErrors({ invitations: 'Invite the guest to at least one function' });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const { guest } = await api.createGuest({ ...form, invitations });
      toast.success(`${guest.name} added as ${guest.code}.`);

      if (andSend) {
        try {
          await sendWhatsApp(guest, 'INVITATION');
          toast.success('Invitation opened in WhatsApp. Send your card in the same chat.');
        } catch (err) {
          toast.error(`Guest saved, but WhatsApp could not open: ${err.message}`);
        }
      }

      navigate(`/guests?function=${invitations[0].functionKey}`);
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        setErrors(Object.fromEntries(error.details.map((d) => [d.field, d.message])));
      }
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!functions) return <LoadingState label="Loading…" />;

  return (
    <>
      <PageHeader
        title="Add guest"
        subtitle="Add a guest, then send the invitation on WhatsApp."
        actions={
          <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/guests')}>
            <ArrowLeft size={15} /> Back
          </button>
        }
      />

      <form onSubmit={(event) => submit(event, false)} className="card max-w-2xl p-4 sm:p-6">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Full name *</label>
            <input
              id="name" className="input" value={form.name} onChange={set('name')}
              placeholder="e.g. Ahmed Khan" autoComplete="off" required
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="phone">Mobile number *</label>
              <input
                id="phone" className="input" value={form.phone} onChange={set('phone')}
                placeholder="e.g. +91 98765 43210" inputMode="tel" autoComplete="off" required
              />
              {errors.phone ? (
                <p className="field-error">{errors.phone}</p>
              ) : (
                <p className="mt-1.5 text-xs text-ink-400">
                  Include the country code so WhatsApp opens the right chat.
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="familyName">Family / group name</label>
              <input
                id="familyName" className="input" value={form.familyName} onChange={set('familyName')}
                placeholder="e.g. Khan Family" autoComplete="off"
              />
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
            <label className="label" htmlFor="notes">Notes</label>
            <textarea
              id="notes" rows={3} className="input resize-none" value={form.notes} onChange={set('notes')}
              placeholder="Anything worth remembering about this guest"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
          <button type="submit" className="btn-secondary" disabled={saving}>
            <Check size={16} /> {saving ? 'Saving…' : 'Save guest'}
          </button>
          <button
            type="button"
            className="btn-whatsapp"
            disabled={saving}
            onClick={(event) => submit(event, true)}
          >
            <MessageCircle size={16} /> Save & send WhatsApp
          </button>
        </div>
      </form>
    </>
  );
}
