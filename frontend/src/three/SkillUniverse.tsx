// Only the Float helper is imported, not the whole drei library, to keep the 3D download small
import { Float } from '@react-three/drei/core/Float'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import type { Group, Object3D } from 'three'
import LabelSync from './Labels.tsx'
import type { SceneProps } from './support.ts'

export interface UniverseSkill {
  skill: string
  applications: number
}

interface PlacedSkill extends UniverseSkill {
  radius: number
  position: [number, number, number]
  weight: number
}

const PHONE_LIMIT = 6

// A skill that is missing more often is bigger and closer to the viewer.
// The skills stand in two staggered rows, most often missing first (top left), with enough room
// between them that spheres and labels do not cover each other.
function placeSkills(allSkills: UniverseSkill[], phone: boolean): PlacedSkill[] {
  const skills = phone ? allSkills.slice(0, PHONE_LIMIT) : allSkills
  const max = Math.max(...skills.map((skill) => skill.applications))
  const perRow = Math.ceil(skills.length / 2)
  // The distance between two neighbours in a row, limited by the width that fits on the screen
  const step = Math.min(phone ? 1.3 : 2.4, (phone ? 3.9 : 11) / Math.max(1, perRow))
  return skills.map((skill, index) => {
    const weight = skill.applications / max
    const row = index % 2
    const slot = Math.floor(index / 2)
    // The lower row is shifted by half a step; the quarter step keeps both rows centered together
    const x = (slot - (perRow - 1) / 2) * step + (row === 1 ? step / 2 : 0) - (skills.length > 1 ? step / 4 : 0)
    return {
      ...skill,
      weight,
      radius: (0.18 + 0.24 * weight) * (phone ? 0.8 : 1),
      position: [x, row === 0 ? 0.85 : -0.95, -1.4 + 2.0 * weight],
    }
  })
}

function Universe({
  placed,
  phone,
  palette,
  hovered,
  setHovered,
  labels,
}: Pick<SceneProps, 'phone' | 'palette'> & {
  placed: PlacedSkill[]
  hovered: number | null
  setHovered: (update: (current: number | null) => number | null) => void
  labels: React.RefObject<(HTMLElement | null)[]>
}) {
  const group = useRef<Group>(null)
  const spheres = useRef<(Object3D | null)[]>([])
  const segments = phone ? 16 : 28

  // A slow sway instead of a full turn, so "closer" keeps meaning "more often". It holds still while hovering.
  useFrame((state) => {
    if (!group.current || hovered !== null) return
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.22
    group.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.2) * 0.06
  })

  return (
    <>
      <group ref={group}>
        {placed.map((item, index) => {
          const isHovered = hovered === index
          return (
            <group key={item.skill} position={item.position}>
              {/* Float: each skill bobs a little on its own, so the scene never looks frozen */}
              <Float speed={hovered === null ? 1.2 : 0} rotationIntensity={0} floatIntensity={0.5}>
                <mesh
                  ref={(object) => {
                    spheres.current[index] = object
                  }}
                  scale={isHovered ? 1.12 : 1}
                  onPointerOver={(event) => {
                    event.stopPropagation()
                    setHovered(() => index)
                  }}
                  onPointerOut={() => setHovered((current) => (current === index ? null : current))}
                  // On a touch screen there is no hover, so a tap shows the same information
                  onClick={(event) => {
                    event.stopPropagation()
                    setHovered((current) => (current === index ? null : index))
                  }}
                >
                  <sphereGeometry args={[item.radius, segments, segments]} />
                  <meshStandardMaterial
                    color={palette.accent}
                    emissive={palette.accentGlow}
                    emissiveIntensity={0.15 + 0.5 * item.weight + (isHovered ? 0.3 : 0)}
                    roughness={0.35}
                  />
                </mesh>
                <mesh scale={1.7}>
                  <sphereGeometry args={[item.radius, 16, 16]} />
                  <meshBasicMaterial
                    color={palette.accentGlow}
                    transparent
                    opacity={0.06 + 0.1 * item.weight}
                    depthWrite={false}
                  />
                </mesh>
              </Float>
            </group>
          )
        })}
      </group>
      <LabelSync objects={spheres} labels={labels} offsets={placed.map((item) => item.radius + 0.1)} />
    </>
  )
}

// The insights page "skill universe": the most often missing skills as spheres. Bigger and closer = missing
// more often. Hovering (or tapping) a sphere shows how many applications need the skill.
export default function SkillUniverse({
  active,
  phone,
  palette,
  skills,
  analyzed,
}: SceneProps & { skills: UniverseSkill[]; analyzed: number }) {
  const labels = useRef<(HTMLElement | null)[]>([])
  const [hovered, setHovered] = useState<number | null>(null)
  const placed = useMemo(() => placeSkills(skills, phone), [skills, phone])

  return (
    <>
      <Canvas
        dpr={phone ? [1, 1.25] : [1, 1.5]}
        frameloop={active ? 'always' : 'never'}
        gl={{ antialias: !phone, alpha: true, powerPreference: 'low-power' }}
        // A narrow lens far away: spheres near the edges stay round instead of being stretched
        camera={{ position: [0, 0, 8.6], fov: 35 }}
        // pan-y: a finger can still scroll the page up and down over the scene
        style={{ touchAction: 'pan-y', cursor: hovered === null ? 'default' : 'pointer' }}
        onPointerMissed={() => setHovered(() => null)}
        aria-hidden
      >
        <ambientLight intensity={1.1} />
        <pointLight position={[3, 4, 6]} intensity={45} color={palette.light} />
        <Universe placed={placed} phone={phone} palette={palette} hovered={hovered} setHovered={setHovered} labels={labels} />
      </Canvas>
      {/* The skill names (and the details of the hovered skill), placed over the canvas and moved by LabelSync */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {placed.map((item, index) => (
          <span
            key={item.skill}
            ref={(element) => {
              labels.current[index] = element
            }}
            className="absolute left-0 top-0 will-change-transform"
          >
            {hovered === index ? (
              <span className="block whitespace-nowrap rounded-lg border bg-popover px-3 py-2 text-xs shadow-raised" data-testid="universe-tooltip">
                <span className="block font-semibold text-popover-foreground">{item.skill}</span>
                <span className="text-muted-foreground">
                  Needed by {item.applications} of your {analyzed} analyzed {analyzed === 1 ? 'application' : 'applications'}
                </span>
              </span>
            ) : (
              <span data-universe-label className="block whitespace-nowrap rounded-full border bg-card/85 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm">
                {item.skill}
              </span>
            )}
          </span>
        ))}
      </div>
    </>
  )
}
