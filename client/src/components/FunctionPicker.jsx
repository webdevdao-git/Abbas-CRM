import { FUNCTION_STYLE } from '../lib/constants.js';

/// Choose which ceremonies a guest is invited to, and how many people for
/// each. A guest can be on one list, the other, or both.
export default function FunctionPicker({ functions, value, onChange, error }) {
  const toggle = (key, checked) => {
    if (checked) {
      onChange([...value, { functionKey: key, invitedCount: 1 }]);
    } else {
      onChange(value.filter((entry) => entry.functionKey !== key));
    }
  };

  const setCount = (key, count) =>
    onChange(
      value.map((entry) =>
        entry.functionKey === key ? { ...entry, invitedCount: count } : entry
      )
    );

  return (
    <fieldset>
      <legend className="label">Invited to *</legend>
      <p className="mb-2 -mt-1 text-xs text-ink-400">
        Engagement and DAREES are separate lists — pick one or both.
      </p>

      <div className="space-y-2">
        {functions.map((fn) => {
          const entry = value.find((candidate) => candidate.functionKey === fn.key);
          const checked = Boolean(entry);

          return (
            <div
              key={fn.key}
              className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors ${
                checked ? 'border-ink-300 bg-ink-50/60' : 'border-ink-200'
              }`}
            >
              <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-3 sm:min-h-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => toggle(fn.key, event.target.checked)}
                  className="checkbox"
                />
                <span className="min-w-0">
                  <span className={`badge ${FUNCTION_STYLE[fn.key]?.chip ?? 'bg-ink-100 text-ink-600'}`}>
                    {fn.name}
                  </span>
                  {fn.time && <span className="ml-2 text-xs text-ink-400">{fn.time}</span>}
                </span>
              </label>

              {checked && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-ink-500" htmlFor={`count-${fn.key}`}>
                    People
                  </label>
                  <input
                    id={`count-${fn.key}`}
                    type="number"
                    min={1}
                    max={500}
                    inputMode="numeric"
                    value={entry.invitedCount}
                    onChange={(event) => setCount(fn.key, Number(event.target.value))}
                    className="min-h-[44px] w-20 rounded-lg border border-ink-200 px-2.5 text-base font-semibold tabular-nums focus:border-ink-900 focus:outline-none sm:min-h-0 sm:py-1.5 sm:text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}
