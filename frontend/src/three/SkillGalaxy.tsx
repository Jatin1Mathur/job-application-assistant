// Only the Line helper is imported, not the whole drei library, to keep the 3D download small
import { Line } from '@react-three/drei/core/Line'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group, Object3D } from 'three'
import { GALAXY_SKILLS, GALAXY_SKILLS_PHONE, nearestEdges, spherePoints } from './galaxyData.ts'
import LabelSync from './Labels.tsx'
import type { SceneProps } from './support.ts'

const sphereRadius = (matching: boolean) => (matching ? 0.2 : 0.14)

function Galaxy({
  phone,
  palette,
  labels,
}: Pick<SceneProps, 'phone' | 'palette'> & { labels: React.RefObject<(HTMLElement | null)[]> }) {
  const group = useRef<Group>(null)
  const spheres = useRef<(Object3D | null)[]>([])
  // Where the mouse is, from -1 to 1 in both directions. Followed on the whole window,
  // so the galaxy reacts even when the mouse is over the text next to it.
  const mouse = useRef({ x: 0, y: 0 })

  const skills = phone ? GALAXY_SKILLS_PHONE : GALAXY_SKILLS
  const points = useMemo(() => spherePoints(skills.length, 2.4), [skills.length])
  // Each pair of points is one thin line between two skills
  const linePoints = useMemo(() => nearestEdges(points).flatMap(([from, to]) => [points[from], points[to]]), [points])
  const segments = phone ? 16 : 28

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // Runs before every frame: a slow turn, plus a gentle lean towards the mouse (parallax)
  useFrame((_, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * 0.08
    group.current.rotation.x += (mouse.current.y * 0.22 - group.current.rotation.x) * 0.04
    group.current.position.x += (mouse.current.x * 0.25 - group.current.position.x) * 0.04
  })

  return (
    <>
      <group ref={group}>
        <Line points={linePoints} segments color={palette.line} lineWidth={1} transparent opacity={palette.lineOpacity} />

        {skills.map((skill, index) => {
          const radius = sphereRadius(skill.matching)
          return (
            <group
              key={skill.name}
              position={points[index]}
              ref={(object) => {
                spheres.current[index] = object
              }}
            >
              <mesh>
                <sphereGeometry args={[radius, segments, segments]} />
                <meshStandardMaterial
                  color={skill.matching ? palette.accent : palette.dim}
                  emissive={skill.matching ? palette.accentGlow : palette.dim}
                  emissiveIntensity={skill.matching ? 0.55 : 0.08}
                  roughness={0.35}
                />
              </mesh>
              {/* The glow: a bigger, see-through sphere around a matching skill. Cheaper than a real bloom effect */}
              {skill.matching && (
                <mesh scale={1.9}>
                  <sphereGeometry args={[radius, 16, 16]} />
                  <meshBasicMaterial color={palette.accentGlow} transparent opacity={0.16} depthWrite={false} />
                </mesh>
              )}
            </group>
          )
        })}
      </group>
      <LabelSync objects={spheres} labels={labels} offsets={skills.map((skill) => sphereRadius(skill.matching) + 0.12)} />
    </>
  )
}

// The landing page hero: skills as glowing spheres connected by thin lines, slowly rotating.
// Loaded lazily (see Lazy3D). pointer-events: none, so it can never block a click or a scroll.
export default function SkillGalaxy({ active, phone, palette }: SceneProps) {
  const labels = useRef<(HTMLElement | null)[]>([])
  const skills = phone ? GALAXY_SKILLS_PHONE : GALAXY_SKILLS
  return (
    <>
      <Canvas
        // Never render more pixels than needed: at most 1.5x (1.25x on phones), even on very sharp screens
        dpr={phone ? [1, 1.25] : [1, 1.5]}
        // "never" stops the render loop while the scene is off-screen or the tab is hidden
        frameloop={active ? 'always' : 'never'}
        gl={{ antialias: !phone, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 6.2], fov: 50 }}
        style={{ pointerEvents: 'none' }}
        aria-hidden
      >
        <ambientLight intensity={1.1} />
        <pointLight position={[4, 5, 6]} intensity={40} color={palette.light} />
        <Galaxy phone={phone} palette={palette} labels={labels} />
      </Canvas>
      {/* The skill names, placed over the canvas and moved by LabelSync */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {skills.map((skill, index) => (
          <span
            key={skill.name}
            ref={(element) => {
              labels.current[index] = element
            }}
            data-galaxy-label
            className={`absolute left-0 top-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm will-change-transform ${
              skill.matching ? 'bg-card/85 text-foreground' : 'bg-card/60 text-muted-foreground'
            }`}
          >
            {skill.name}
          </span>
        ))}
      </div>
    </>
  )
}
