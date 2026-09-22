import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, UserPlus } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatLongDate } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import FunctionSummary from '../components/FunctionSummary.jsx';
import { LoadingState, ErrorState } from '../components/States.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.stats());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const { event, functions, overall } = data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={formatLongDate(event.date)}
        actions={
          <Link to="/guests" className="btn-secondary btn-sm">
            View guests <ArrowRight size={14} />
          </Link>
        }
      />

      {/* One card per ceremony — separate guest lists, separate headcounts. */}
      <div className="grid gap-3 lg:grid-cols-2">
        {functions.map((fn) => (
          <FunctionSummary key={fn.key} fn={fn} />
        ))}
      </div>

      <p className="mt-4 text-sm text-ink-400">
        {overall.totalContacts} {overall.totalContacts === 1 ? 'person' : 'people'} on the contact
        list
        <span className="mx-2 text-ink-300">·</span>
        {overall.invitationSent} of {overall.totalContacts} WhatsApp invitations sent
      </p>

      {overall.totalContacts === 0 && (
        <div className="mt-5">
          <Link to="/guests/new" className="btn-primary btn-sm">
            <UserPlus size={15} /> Add your first guest
          </Link>
        </div>
      )}
    </>
  );
}
