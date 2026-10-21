// Plain SVG bars: one per day or week. A gap (no bar) means nothing recorded.
export default function TrackerChart({ series, unit }) {
  const { metric, buckets } = series
  const W = 320
  const H = 120
  const top = 14
  const bottom = 20
  const values = buckets.map((b) => b.value ?? 0)
  const max = Math.max(metric === 'avg' ? 5 : 1, ...values)
  const slot = W / buckets.length
  const barW = slot * 0.62
  const plotH = H - top - bottom
  const total = buckets.reduce((sum, b) => sum + (b.value ?? 0), 0)
  const shown = (v) => (Number.isInteger(v) ? v : Number(v.toFixed(1)))

  return (
    <svg
      className="tracker-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Chart of ${unit}: ${metric === 'avg' ? 'highest average' : 'total'} ${shown(metric === 'avg' ? max : total)} across ${buckets.length} periods`}
    >
      <line x1="0" x2={W} y1={H - bottom} y2={H - bottom} stroke="var(--line)" />
      <text x="0" y="9" fontSize="9" fill="var(--ink-soft)">{shown(max)}</text>
      {buckets.map((b, i) => {
        if (b.value === null || b.value === 0) return null
        const h = Math.max(2, (b.value / max) * plotH)
        return (
          <rect key={i} x={i * slot + (slot - barW) / 2} y={H - bottom - h} width={barW} height={h} rx="2" fill="var(--accent)">
            <title>{`${b.label}: ${shown(b.value)}`}</title>
          </rect>
        )
      })}
      <text x="0" y={H - 5} fontSize="9" fill="var(--ink-soft)">{buckets[0].label}</text>
      <text x={W} y={H - 5} fontSize="9" textAnchor="end" fill="var(--ink-soft)">{buckets[buckets.length - 1].label}</text>
    </svg>
  )
}
