// The skills shown around the backpack in the landing page hero. Kept apart from the 3D code so the
// static fallback can use the same list without loading three.js.
export interface HeroSkill {
  name: string
  // Matching skills glow in the accent color; missing skills are dimmer
  matching: boolean
}

export const HERO_SKILLS: HeroSkill[] = [
  { name: 'Java', matching: true },
  { name: 'Spring Boot', matching: true },
  { name: 'Docker', matching: false },
  { name: 'Python', matching: true },
  { name: 'SQL', matching: true },
  { name: 'Kubernetes', matching: false },
]

// Phones show fewer skills
export const HERO_SKILLS_PHONE = HERO_SKILLS.slice(0, 4)

// Two tilted orbits around the backpack. Each skill gets a place on one of them.
export const ORBITS = [
  { radius: 1.12, tilt: 0.22, speed: 0.16 },
  { radius: 1.42, tilt: -0.14, speed: -0.11 },
]

// Where skill number `index` of `count` sits at time `time` (seconds): [x, y, z] around the origin
export function orbitPosition(index: number, count: number, time: number): [number, number, number] {
  const orbit = ORBITS[index % ORBITS.length]
  const onThisOrbit = Math.ceil(count / ORBITS.length)
  const angle = (Math.floor(index / ORBITS.length) / onThisOrbit) * Math.PI * 2 + (index % ORBITS.length) * 0.9 + time * orbit.speed
  const x = Math.cos(angle) * orbit.radius
  const z = Math.sin(angle) * orbit.radius
  // Tilt the circle around the front-to-back axis, so the orbit rises on one side and dips on the other
  return [x * Math.cos(orbit.tilt), x * Math.sin(orbit.tilt) - 0.05, z]
}
