const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Controlled picker for a task's repeat rule. `value` is null or
// { type, unit, interval, weekdays }; see utils/recurrence.js.
export default function RepeatPicker({ value, onChange, dueDate }) {
  const mode = value?.type ?? 'none'
  const n = Number(value?.interval) || 1
  const set = (patch) => onChange({ ...value, ...patch })

  function changeMode(next) {
    if (next === 'none') return onChange(null)
    onChange({
      type: next,
      unit: value?.unit ?? 'week',
      interval: value?.interval ?? 1,
      weekdays: value?.weekdays ?? [],
    })
  }

  function toggleDay(d) {
    const days = value.weekdays ?? []
    set({ weekdays: days.includes(d) ? days.filter((x) => x !== d) : [...days, d] })
  }

  return (
    <div className="repeat">
      <label className="field">
        <span>Repeat</span>
        <select value={mode} onChange={(e) => changeMode(e.target.value)}>
          <option value="none">Doesn't repeat</option>
          <option value="fixed">On a schedule</option>
          <option value="after">After I finish it</option>
        </select>
      </label>

      {value && (
        <div className="repeat__row">
          <span>Every</span>
          <input
            type="number"
            min="1"
            max="99"
            aria-label="Repeat interval"
            value={value.interval}
            onChange={(e) => set({ interval: e.target.value })}
          />
          <select aria-label="Repeat unit" value={value.unit} onChange={(e) => set({ unit: e.target.value })}>
            <option value="day">{n === 1 ? 'day' : 'days'}</option>
            <option value="week">{n === 1 ? 'week' : 'weeks'}</option>
            <option value="month">{n === 1 ? 'month' : 'months'}</option>
          </select>
          {value.type === 'after' && <span>after</span>}
        </div>
      )}

      {value?.type === 'fixed' && value.unit === 'week' && (
        <div className="repeat__days">
          {DAY_LETTERS.map((letter, d) => (
            <button
              key={d}
              type="button"
              aria-label={DAY_NAMES[d]}
              aria-pressed={(value.weekdays ?? []).includes(d)}
              className={`chip${(value.weekdays ?? []).includes(d) ? ' chip--active' : ''}`}
              onClick={() => toggleDay(d)}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {value?.type === 'fixed' && value.unit === 'month' && (
        <p className="repeat__hint">
          On the same day each month{dueDate ? ` (day ${Number(dueDate.slice(8, 10))}, from the due date)` : ''}.
        </p>
      )}

      {value && (
        <p className="repeat__hint">
          {value.type === 'fixed'
            ? 'The next one appears when you finish or skip this one. Missed days never pile up.'
            : 'The next one is scheduled from the day you finish this one.'}
          {' '}Needs a due date; today is used if you leave it empty.
        </p>
      )}
    </div>
  )
}
