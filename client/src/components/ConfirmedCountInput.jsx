import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

/// Inline stepper for "how many are actually coming". Commits on blur or
/// Enter so a stray keystroke never fires a request per digit.
export default function ConfirmedCountInput({ value, max, onCommit, busy = false }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = (next) => {
    const parsed = Math.max(0, Math.min(max, Number(next)));
    if (Number.isNaN(parsed)) return setDraft(String(value));
    setDraft(String(parsed));
    if (parsed !== value) onCommit(parsed);
    return undefined;
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-ink-200">
      <button
        type="button"
        className="px-2 py-1.5 text-ink-500 hover:bg-ink-50 disabled:opacity-40"
        onClick={() => commit(value - 1)}
        disabled={busy || value <= 0}
        aria-label="One fewer person"
      >
        <Minus size={13} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={draft}
        disabled={busy}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        className="w-11 border-x border-ink-200 py-1.5 text-center text-xs font-semibold tabular-nums text-ink-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={`Confirmed people, maximum ${max}`}
      />
      <button
        type="button"
        className="px-2 py-1.5 text-ink-500 hover:bg-ink-50 disabled:opacity-40"
        onClick={() => commit(value + 1)}
        disabled={busy || value >= max}
        aria-label="One more person"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
