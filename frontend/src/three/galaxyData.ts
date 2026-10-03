// The skills of the landing page "skill galaxy". Kept apart from the 3D code so the static fallback
// can use the same list without loading three.js.
export interface GalaxySkill {
  name: string
  // Matching skills glow in the accent color; missing skills are dimmer
  matching: boolean
}

export const GALAXY_SKILLS: GalaxySkill[] = [
  { name: 'Java', matching: true },
  { name: 'Spring Boot', matching: true },
  { name: 'Docker', matching: false },
  { name: 'Python', matching: true },
  { name: 'React', matching: true },
  { name: 'SQL', matching: true },
  { name: 'Kubernetes', matching: false },
  { name: 'Git', matching: true },
  { name: 'TypeScript', matching: true },
  { name: 'AWS', matching: false },
  { name: 'REST APIs', matching: true },
  { name: 'Kafka', matching: false },
]

// Phones show fewer skills
export const GALAXY_SKILLS_PHONE = GALAXY_SKILLS.slice(0, 7)

// Spreads n points evenly over a sphere (a "Fibonacci sphere"), so the layout is the same on every visit
export function spherePoints(count: number, radius: number): [number, number, number][] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / Math.max(1, count - 1)) * 2
    const ring = Math.sqrt(1 - y * y)
    const angle = golden * index
    // Slightly different distances from the center make it look less like a perfect ball
    const distance = radius * (0.82 + 0.18 * ((index * 7) % 5) / 4)
    return [Math.cos(angle) * ring * distance, y * distance * 0.8, Math.sin(angle) * ring * distance]
  })
}

// Connects every point to its two nearest neighbours; each pair is listed once
export function nearestEdges(points: [number, number, number][]): [number, number][] {
  const edges = new Set<string>()
  points.forEach((point, index) => {
    points
      .map((other, otherIndex) => ({ otherIndex, distance: Math.hypot(point[0] - other[0], point[1] - other[1], point[2] - other[2]) }))
      .filter(({ otherIndex }) => otherIndex !== index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .forEach(({ otherIndex }) => edges.add([Math.min(index, otherIndex), Math.max(index, otherIndex)].join('-')))
  })
  return [...edges].map((edge) => edge.split('-').map(Number) as [number, number])
}
