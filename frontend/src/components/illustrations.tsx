// Small pictures for the empty states, one per page, drawn with the colours of the design system:
// ink lines, paper fill, the accent (tide) for the one part that matters, sand for warmth.
// They are decoration: the text next to them says everything.

const frame = { viewBox: '0 0 160 120', className: 'h-28 w-40', 'aria-hidden': true } as const
const line = { stroke: 'var(--foreground)', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// Applications: a paper plane on its way
export function PaperPlaneArt() {
  return (
    <svg {...frame} data-art="paper-plane">
      <ellipse cx="80" cy="104" rx="46" ry="5" fill="var(--foreground)" opacity="0.08" />
      <path d="M18 92c14-3 22-12 30-24" fill="none" {...line} strokeDasharray="2 7" opacity="0.45" />
      <path d="M52 62 132 22 108 92 86 72Z" fill="var(--card)" {...line} />
      <path d="M52 62 86 72 132 22Z" fill="var(--encourage)" {...line} />
      <path d="M86 72 90 96 100 84" fill="var(--primary)" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

// Resumes: a small stack of documents
export function DocumentStackArt() {
  return (
    <svg {...frame} data-art="document-stack">
      <ellipse cx="80" cy="106" rx="44" ry="5" fill="var(--foreground)" opacity="0.08" />
      <rect x="58" y="20" width="58" height="76" rx="6" fill="var(--muted)" {...line} transform="rotate(8 87 58)" />
      <rect x="50" y="18" width="58" height="76" rx="6" fill="var(--encourage)" {...line} transform="rotate(-5 79 56)" />
      <rect x="48" y="22" width="58" height="76" rx="6" fill="var(--card)" {...line} />
      <path d="M58 38h22" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
      <path d="M58 52h38M58 62h30M58 72h38M58 82h20" fill="none" {...line} strokeWidth="1.75" opacity="0.45" />
    </svg>
  )
}

// Insights: a telescope looking for what is not visible yet
export function TelescopeArt() {
  return (
    <svg {...frame} data-art="telescope">
      <ellipse cx="78" cy="108" rx="40" ry="5" fill="var(--foreground)" opacity="0.08" />
      <path d="M78 66 60 106M78 66 96 106M78 66v40" fill="none" {...line} />
      <g transform="rotate(-24 78 58)">
        <rect x="34" y="46" width="62" height="24" rx="5" fill="var(--card)" {...line} />
        <rect x="96" y="42" width="26" height="32" rx="5" fill="var(--primary)" stroke="var(--primary)" strokeWidth="2" />
        <rect x="24" y="50" width="10" height="16" rx="3" fill="var(--encourage)" {...line} />
      </g>
      <path d="M132 20v8M128 24h8M24 30v6M21 33h6M140 54v5M137.500 56.500h5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
