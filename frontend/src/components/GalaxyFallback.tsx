import { GALAXY_SKILLS, nearestEdges, spherePoints } from '../three/galaxyData.ts'

// The static version of the skill galaxy: the same skills and connections, drawn once as a flat picture.
// Shown without WebGL, with "reduce motion", and for the moment before the 3D code has loaded.
export default function GalaxyFallback() {
  // Turned a little around the vertical axis, to a view where no two labels sit on top of each other
  const TURN = 0.9
  const points = spherePoints(GALAXY_SKILLS.length, 2.4).map(
    ([x, y, z]) => [x * Math.cos(TURN) + z * Math.sin(TURN), y, -x * Math.sin(TURN) + z * Math.cos(TURN)] as [number, number, number],
  )
  // A simple "camera": things further away are drawn smaller and closer to the middle
  const project = ([x, y, z]: [number, number, number]) => {
    const depth = 6.2 / (6.2 - z)
    return { x: 250 + x * 78 * depth, y: 210 - y * 78 * depth, depth }
  }
  const flat = points.map(project)

  return (
    <svg viewBox="0 0 500 420" className="size-full" aria-hidden>
      <defs>
        <radialGradient id="galaxy-glow">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {nearestEdges(points).map(([from, to]) => (
        <line
          key={`${from}-${to}`}
          x1={flat[from].x}
          y1={flat[from].y}
          x2={flat[to].x}
          y2={flat[to].y}
          stroke="var(--foreground)"
          strokeOpacity="0.16"
          strokeWidth="1"
        />
      ))}
      {GALAXY_SKILLS.map((skill, index) => {
        const { x, y, depth } = flat[index]
        const radius = (skill.matching ? 13 : 9) * depth
        return (
          <g key={skill.name}>
            {skill.matching && <circle cx={x} cy={y} r={radius * 2.4} fill="url(#galaxy-glow)" />}
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={skill.matching ? 'var(--brand)' : 'var(--muted)'}
              stroke="var(--foreground)"
              strokeOpacity={skill.matching ? 0.35 : 0.2}
            />
            <text
              x={x}
              y={y + radius + 15}
              textAnchor="middle"
              fontSize="12"
              fontWeight="500"
              fill={skill.matching ? 'var(--foreground)' : 'var(--muted-foreground)'}
            >
              {skill.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
