// A very small line chart without axes: the shape of the last weeks next to a number.
// Decoration for sighted users; the card it sits in says the same in words for screen readers.
// Weeks without a value (null) are skipped, not drawn as zero.
export default function Sparkline({ values }: { values: (number | null)[] }) {
  const width = 96
  const height = 28
  const pad = 3
  const known = values.map((value, index) => ({ value, index })).filter((point): point is { value: number; index: number } => point.value !== null)
  const max = Math.max(...known.map((point) => point.value), 0)
  const min = Math.min(...known.map((point) => point.value), 0)
  const span = max - min || 1
  const x = (index: number) => pad + (index / Math.max(1, values.length - 1)) * (width - 2 * pad)
  const y = (value: number) => height - pad - ((value - min) / span) * (height - 2 * pad)
  const points = known.map((point) => `${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`)
  const last = known.at(-1)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-24 shrink-0" aria-hidden data-sparkline>
      <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke="var(--border)" />
      {points.length > 1 && <polyline points={points.join(' ')} fill="none" stroke="var(--primary)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />}
      {last && <circle cx={x(last.index)} cy={y(last.value)} r="2.6" fill="var(--primary)" stroke="var(--card)" strokeWidth="1.5" />}
    </svg>
  )
}
