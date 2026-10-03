// The flat version of the login compass: shown with "reduce motion", without WebGL, and while the 3D code loads.
// The needle points away from north until the login succeeds, then it points north.
export default function CompassFallback({ north }: { north: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className="size-full" aria-hidden data-compass={north ? 'north' : 'searching'}>
      <circle cx="100" cy="100" r="84" fill="#ffeccd" />
      <circle cx="100" cy="100" r="74" fill="#f9f6f1" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="100" y1={i % 3 === 0 ? 30 : 32} x2="100" y2={i % 3 === 0 ? 46 : 40} stroke="#1e1a14" strokeWidth={i % 3 === 0 ? 3 : 1.5} transform={`rotate(${i * 30} 100 100)`} />
      ))}
      <text x="100" y="66" textAnchor="middle" fontSize="16" fontWeight="700" fill="#006375">
        N
      </text>
      <g className="origin-center transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `rotate(${north ? 0 : 52}deg)`, transformBox: 'view-box' }}>
        <path d="M92 100 100 48 108 100Z" fill="#006375" />
        <path d="M92 100 100 152 108 100Z" fill="#1e1a14" />
      </g>
      <circle cx="100" cy="100" r="7" fill="#ffeccd" stroke="#1e1a14" strokeWidth="1.5" />
    </svg>
  )
}
