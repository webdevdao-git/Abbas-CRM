import { useEffect, useState } from 'react';
import { Save, Calendar, CalendarClock, MessageSquare, KeyRound, Info } from 'lucide-react';
import { api } from '../lib/api.js';
import { toDateInput } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';

const TEMPLATE_LABELS = {
  INVITATION: 'Invitation message',
  REMINDER: 'Reminder message',
  CONFIRMATION: 'Confirmation message',
};

const TEMPLATE_HINTS = {
  INVITATION: 'Sent with the invitation card. Ask the guest to reply YES or NO.',
  REMINDER: 'Sent to guests who have not replied yet.',
  CONFIRMATION: 'A thank-you once a guest has confirmed.',
};

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="card p-4 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600">
          <Icon size={17} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Settings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [event, setEvent] = useState(null);
  const [functions, setFunctions] = useState([]);
  const [savingFunction, setSavingFunction] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [placeholders, setPlaceholders] = useState([]);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventData, templateData] = await Promise.all([api.getEvent(), api.listTemplates()]);
      setEvent({ ...eventData.event, date: toDateInput(eventData.event.date) });
      setFunctions(eventData.functions);
      setTemplates(templateData.templates);
      setPlaceholders(templateData.placeholders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveEvent = async (formEvent) => {
    formEvent.preventDefault();
    setSavingEvent(true);
    try {
      const { event: updated } = await api.updateEvent({
        name: event.name,
        date: event.date,
        venue: event.venue ?? '',
        hostName: event.hostName ?? '',
        description: event.description ?? '',
      });
      setEvent({ ...updated, date: toDateInput(updated.date) });
      toast.success('Event details saved.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingEvent(false);
    }
  };

  const saveFunction = async (fn) => {
    setSavingFunction(fn.key);
    try {
      await api.updateFunction(fn.key, {
        name: fn.name,
        time: fn.time ?? '',
        venue: fn.venue ?? '',
      });
      toast.success(`${fn.name} saved.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingFunction(null);
    }
  };

  const saveTemplate = async (template) => {
    setSavingTemplate(template.key);
    try {
      await api.updateTemplate(template.key, { body: template.body });
      toast.success(`${TEMPLATE_LABELS[template.key]} saved.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingTemplate(null);
    }
  };

  const savePassword = async (formEvent) => {
    formEvent.preventDefault();
    setSavingPassword(true);
    try {
      await api.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      toast.success('Password changed.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <LoadingState label="Loading settings…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <PageHeader title="Settings" subtitle="Event details, WhatsApp messages and your login." />

      <div className="max-w-3xl space-y-4">
        <Section
          icon={Calendar}
          title="Event details"
          description="Used everywhere, including in the WhatsApp messages."
        >
          <form onSubmit={saveEvent} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="event-name">Event name</label>
                <input
                  id="event-name" className="input" value={event.name}
                  onChange={(e) => setEvent({ ...event, name: e.target.value })} required
                />
              </div>
              <div>
                <label className="label" htmlFor="event-date">Date</label>
                <input
                  id="event-date" type="date" className="input" value={event.date}
                  onChange={(e) => setEvent({ ...event, date: e.target.value })} required
                />
              </div>
              <div>
                <label className="label" htmlFor="host-name">Host name</label>
                <input
                  id="host-name" className="input" value={event.hostName ?? ''}
                  onChange={(e) => setEvent({ ...event, hostName: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="venue">Venue</label>
                <input
                  id="venue" className="input" value={event.venue ?? ''}
                  placeholder="Add the venue when confirmed"
                  onChange={(e) => setEvent({ ...event, venue: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingEvent}>
                <Save size={16} /> {savingEvent ? 'Saving…' : 'Save event details'}
              </button>
            </div>
          </form>
        </Section>

        <Section
          icon={CalendarClock}
          title="Functions"
          description="Engagement and DAREES have separate guest lists and separate headcounts."
        >
          <div className="space-y-4">
            {functions.map((fn) => (
              <div key={fn.key} className="rounded-xl border border-ink-100 p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label" htmlFor={`fn-name-${fn.key}`}>Name</label>
                    <input
                      id={`fn-name-${fn.key}`} className="input" value={fn.name}
                      onChange={(e) =>
                        setFunctions((current) =>
                          current.map((c) => (c.key === fn.key ? { ...c, name: e.target.value } : c))
                        )
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor={`fn-time-${fn.key}`}>Time</label>
                    <input
                      id={`fn-time-${fn.key}`} className="input" value={fn.time ?? ''}
                      placeholder={fn.key === 'DAREES' ? '1:15 PM (After Zohar Namaz)' : '10:00 AM'}
                      onChange={(e) =>
                        setFunctions((current) =>
                          current.map((c) => (c.key === fn.key ? { ...c, time: e.target.value } : c))
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor={`fn-venue-${fn.key}`}>Venue</label>
                    <input
                      id={`fn-venue-${fn.key}`} className="input" value={fn.venue ?? ''}
                      placeholder="Optional"
                      onChange={(e) =>
                        setFunctions((current) =>
                          current.map((c) => (c.key === fn.key ? { ...c, venue: e.target.value } : c))
                        )
                      }
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => saveFunction(fn)}
                    disabled={savingFunction === fn.key}
                  >
                    <Save size={14} />
                    {savingFunction === fn.key ? 'Saving…' : 'Save function'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          icon={MessageSquare}
          title="WhatsApp message templates"
          description="These are pre-filled into WhatsApp. You still press send yourself."
        >
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
            <Info size={15} className="mt-0.5 shrink-0" />
            <p>
              Available placeholders:{' '}
              {placeholders.map((placeholder, index) => (
                <span key={placeholder}>
                  <code className="rounded bg-white px-1 py-0.5 font-semibold text-ink-800">
                    {`{{${placeholder}}}`}
                  </code>
                  {index < placeholders.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          </div>

          <div className="space-y-5">
            {templates.map((template) => (
              <div key={template.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <label className="label mb-0" htmlFor={`template-${template.key}`}>
                    {TEMPLATE_LABELS[template.key] ?? template.name}
                  </label>
                  <span className="text-xs text-ink-400">{TEMPLATE_HINTS[template.key]}</span>
                </div>
                <textarea
                  id={`template-${template.key}`}
                  rows={10}
                  className="input resize-y font-mono text-[13px] leading-relaxed"
                  value={template.body}
                  onChange={(e) =>
                    setTemplates((current) =>
                      current.map((t) => (t.id === template.id ? { ...t, body: e.target.value } : t))
                    )
                  }
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => saveTemplate(template)}
                    disabled={savingTemplate === template.key}
                  >
                    <Save size={14} />
                    {savingTemplate === template.key ? 'Saving…' : 'Save message'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={KeyRound} title="Admin password" description="Change the password you sign in with.">
          <form onSubmit={savePassword} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="current-password">Current password</label>
                <input
                  id="current-password" type="password" className="input" autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="new-password">New password</label>
                <input
                  id="new-password" type="password" className="input" autoComplete="new-password" minLength={8}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                />
                <p className="mt-1.5 text-xs text-ink-400">At least 8 characters.</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingPassword}>
                <KeyRound size={16} /> {savingPassword ? 'Saving…' : 'Change password'}
              </button>
            </div>
          </form>
        </Section>
      </div>
    </>
  );
}
