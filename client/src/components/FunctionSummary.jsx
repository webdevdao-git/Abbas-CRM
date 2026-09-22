import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FUNCTION_STYLE } from '../lib/constants.js';

/// One ceremony's headcount at a glance. Expected people is the sum of
/// confirmed headcounts for THIS function only.
export default function FunctionSummary({ fn }) {
  const { stats } = fn;
  const total = stats.totalGuests;
  const pct = (n) => (total ? (n / total) * 100 : 0);

  const segments = [
    { key: 'confirmed', value: stats.confirmedGuests, bar: 'bg-emerald-500' },
    { key: 'pending', value: stats.pendingGuests, bar: 'bg-amber-400' },
    { key: 'notAttending', value: stats.notAttendingGuests, bar: 'bg-red-400' },
  ];

  const counts = [
    { label: 'Confirmed', value: stats.confirmedGuests, tone: 'text-emerald-600' },
    { label: 'Pending', value: stats.pendingGuests, tone: 'text-amber-600' },
    { label: 'Not attending', value: stats.notAttendingGuests, tone: 'text-red-500' },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`badge ${FUNCTION_STYLE[fn.key]?.chip ?? 'bg-ink-100 text-ink-600'}`}>
            {fn.name}
          </span>
          <p className="mt-1.5 text-sm text-ink-500">{fn.time || 'Time not set'}</p>
        </div>
        <Link
          to={`/guests?function=${fn.key}`}
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-700"
          aria-label={`View ${fn.name} guests`}
        >
          <ArrowRight size={20} />
        </Link>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums tracking-tight text-ink-900">
          {stats.expectedPeople}
        </span>
        <span className="text-sm text-ink-400">people coming</span>
      </div>

      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
        {segments.map((segment) =>
          segment.value > 0 ? (
            <div key={segment.key} className={segment.bar} style={{ width: `${pct(segment.value)}%` }} />
          ) : null
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3">
        {counts.map((count) => (
          <div key={count.label}>
            <dt className="text-xs text-ink-500">{count.label}</dt>
            <dd className={`mt-0.5 text-lg font-bold tabular-nums ${count.tone}`}>{count.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs text-ink-400">
        {total === 0
          ? 'No guests on this list yet.'
          : `${total} guest${total === 1 ? '' : 's'} invited · ${stats.totalInvitedPeople} people`}
      </p>
    </div>
  );
}
