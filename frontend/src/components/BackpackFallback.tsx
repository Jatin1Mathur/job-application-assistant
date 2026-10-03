import { HERO_SKILLS, ORBITS } from '../three/galaxyData.ts'

// Fixed places for the skills in the flat picture: three on each side of the bag, never on top of it or of each other
const PLACES: [number, number][] = [
  [384, 148],
  [112, 150],
  [406, 218],
  [92, 222],
  [376, 282],
  [122, 286],
]

// The static version of the hero: the same backpack and the same skills on their orbits, drawn once as a
// flat picture. Shown without WebGL, with "reduce motion", and for the moment before the 3D code has loaded.
export default function BackpackFallback() {
  const scale = 118
  const cx = 250
  const cy = 215
  const leather = '#8f4d42'
  const leatherDark = '#6b372b'
  const thread = '#d9b27c'

  return (
    <svg viewBox="55 95 390 250" className="size-full" aria-hidden>
      <defs>
        <radialGradient id="hero-glow">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-shadow">
          <stop offset="0%" stopColor="#000" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* orbits */}
      {ORBITS.map((orbit) => (
        <ellipse
          key={orbit.radius}
          cx={cx}
          cy={cy + 6}
          rx={orbit.radius * scale}
          ry={orbit.radius * scale * 0.22}
          transform={`rotate(${(-orbit.tilt * 180) / Math.PI} ${cx} ${cy})`}
          fill="none"
          stroke="var(--foreground)"
          strokeOpacity="0.14"
        />
      ))}

      {/* backpack, front view */}
      <ellipse cx={cx} cy={cy + 79} rx="78" ry="12" fill="url(#hero-shadow)" />
      <path d={`M${cx - 17} ${cy - 72} q17 -22 34 0`} fill="none" stroke={leather} strokeWidth="6" strokeLinecap="round" />
      <ellipse cx={cx - 61} cy={cy + 36} rx="11" ry="27" fill={leather} />
      <ellipse cx={cx + 61} cy={cy + 36} rx="11" ry="27" fill={leather} />
      <path d={`M${cx - 59} ${cy + 66} V${cy - 15} a59 59 0 0 1 118 0 V${cy + 66} q0 8 -8 8 H${cx - 51} q-8 0 -8 -8 Z`} fill={leather} />
      <path d={`M${cx - 53} ${cy + 26} V${cy - 15} a53 53 0 0 1 106 0 V${cy + 26}`} fill="none" stroke="#2b2724" strokeWidth="2.6" />
      <rect x={cx - 57} y={cy + 64} width="114" height="10" rx="4" fill={leatherDark} />
      <rect x={cx - 44} y={cy - 12} width="88" height="74" rx="8" fill={leather} stroke={leatherDark} strokeOpacity="0.5" />
      <rect x={cx - 45} y={cy - 16} width="90" height="22" rx="6" fill={leather} stroke={leatherDark} strokeOpacity="0.6" />
      <path d={`M${cx - 41} ${cy - 11} H${cx + 41} M${cx - 41} ${cy + 2} H${cx + 41}`} stroke={thread} strokeWidth="1" strokeDasharray="3 2.4" />
      <rect x={cx - 34} y={cy + 4} width="4.5" height="17" rx="1.6" fill={leatherDark} />
      <rect x={cx - 8} y={cy - 50} width="16" height="11" rx="2" fill={leatherDark} opacity="0.7" />

      {/* skills on their orbits */}
      {HERO_SKILLS.map((skill, index) => {
        const [x, y] = PLACES[index % PLACES.length]
        const radius = skill.matching ? 7.5 : 5.5
        return (
          <g key={skill.name}>
            {skill.matching && <circle cx={x} cy={y} r={radius * 2.4} fill="url(#hero-glow)" />}
            <circle cx={x} cy={y} r={radius} fill={skill.matching ? 'var(--primary)' : 'var(--muted)'} stroke="var(--foreground)" strokeOpacity={skill.matching ? 0 : 0.25} />
            <text x={x} y={y + radius + 14} textAnchor="middle" fontSize="12" fontWeight="500" fill={skill.matching ? 'var(--foreground)' : 'var(--muted-foreground)'}>
              {skill.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
