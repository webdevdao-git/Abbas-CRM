import { Check, X, Clock } from 'lucide-react';

const OPTIONS = [
  { value: 'CONFIRMED', label: 'Confirmed', short: 'Yes', icon: Check, active: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'NOT_ATTENDING', label: 'Not attending', short: 'No', icon: X, active: 'bg-red-600 text-white border-red-600' },
  { value: 'PENDING', label: 'Pending', short: 'Pending', icon: Clock, active: 'bg-amber-500 text-white border-amber-500' },
];

/// The one-tap RSVP control, used on rows, cards and the detail modal.
export default function RsvpButtons({ value, onChange, busy = false, compact = false }) {
  return (
    <div
      className="inline-flex w-full rounded-xl border border-ink-200 p-0.5 sm:w-auto"
      role="group"
      aria-label="Set RSVP status"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={busy}
            onClick={() => !isActive && onChange(option.value)}
            aria-pressed={isActive}
            title={option.label}
            className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-1 rounded-[10px] border border-transparent px-2.5 text-xs font-semibold transition-colors disabled:opacity-50 sm:min-h-0 sm:flex-none sm:py-1.5 ${
              isActive ? option.active : 'text-ink-500 hover:bg-ink-50'
            }`}
          >
            <Icon size={13} strokeWidth={2.6} />
            {!compact && <span>{option.short}</span>}
          </button>
        );
      })}
    </div>
  );
}
