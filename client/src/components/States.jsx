import { Loader2, Inbox, AlertTriangle, RefreshCw } from 'lucide-react';

export function Spinner({ className = '' }) {
  return <Loader2 size={18} className={`animate-spin ${className}`} />;
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-ink-400">
      <Spinner className="text-ink-500" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-50 text-ink-400">
        <Icon size={22} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {message && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{message}</p>}
      </div>
      {action}
    </div>
  );
}

/// Shown whenever the API or database is unreachable, so a failed save is
/// never mistaken for a successful one.
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertTriangle size={22} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-ink-900">Could not load data</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}
