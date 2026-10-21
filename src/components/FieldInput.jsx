// The input for one tracker detail, by type. Rating, choice and yes/no are
// tap-again-to-clear chips, so logging stays one or two taps.
export default function FieldInput({ field, value, onChange }) {
  if (field.type === 'number') {
    return (
      <input
        type="number"
        inputMode="decimal"
        step="any"
        aria-label={field.label}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  const choices =
    field.type === 'rating'
      ? [1, 2, 3, 4, 5].map((n) => ({ value: n, text: String(n), label: `${field.label} ${n}` }))
      : field.type === 'yesno'
      ? [
          { value: true, text: 'Yes', label: `${field.label}: Yes` },
          { value: false, text: 'No', label: `${field.label}: No` },
        ]
      : (field.options ?? []).map((o) => ({ value: o, text: o, label: o }))

  return (
    <div className="chips-row" role="group" aria-label={field.label}>
      {choices.map((c) => (
        <button
          key={String(c.value)}
          type="button"
          aria-pressed={value === c.value}
          aria-label={c.label}
          className={`chip${value === c.value ? ' chip--active' : ''}`}
          onClick={() => onChange(value === c.value ? '' : c.value)}
        >
          {c.text}
        </button>
      ))}
    </div>
  )
}
