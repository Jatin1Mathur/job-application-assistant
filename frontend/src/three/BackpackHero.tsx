// Only the Line helper is imported, not the whole drei library, to keep the 3D download small
import { Line } from '@react-three/drei/core/Line'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createBackpack } from './backpack/createBackpack.ts'
import { HERO_SKILLS, HERO_SKILLS_PHONE, ORBITS, orbitPosition } from './galaxyData.ts'
import LabelSync from './Labels.tsx'
import type { SceneProps } from './support.ts'

const skillRadius = (matching: boolean) => (matching ? 0.062 : 0.045)

// A soft dark spot under the bag, so it stands on something instead of floating. Cheaper than real shadows.
function contactShadowTexture() {
  const size = 64
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - size / 2, y - size / 2) / (size / 2)
      const i = (y * size + x) * 4
      data[i] = data[i + 1] = data[i + 2] = 0
      data[i + 3] = Math.max(0, 1 - distance) ** 2 * 150
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function Scene({ phone, palette, labels }: Pick<SceneProps, 'phone' | 'palette'> & { labels: React.RefObject<(HTMLElement | null)[]> }) {
  const stage = useRef<THREE.Group>(null)
  const bag = useRef<THREE.Group>(null)
  const spheres = useRef<(THREE.Object3D | null)[]>([])
  // Where the mouse is, from -1 to 1. Followed on the whole window, so the scene reacts even when the
  // mouse is over the text next to it.
  const mouse = useRef({ x: 0, y: 0 })

  const skills = phone ? HERO_SKILLS_PHONE : HERO_SKILLS
  const backpack = useMemo(() => createBackpack(phone ? 'phone' : 'full'), [phone])
  const shadow = useMemo(contactShadowTexture, [])
  const rings = useMemo(
    () => ORBITS.map((orbit) => Array.from({ length: 65 }, (_, i) => {
      const angle = (i / 64) * Math.PI * 2
      const x = Math.cos(angle) * orbit.radius
      return [x * Math.cos(orbit.tilt), x * Math.sin(orbit.tilt) - 0.05, Math.sin(angle) * orbit.radius] as [number, number, number]
    })),
    [],
  )
  const segments = phone ? 12 : 20

  // Free the geometries and textures when the hero leaves the page
  useEffect(
    () => () => {
      backpack.dispose()
      shadow.dispose()
    },
    [backpack, shadow],
  )

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    // The bag turns slowly from side to side. It never shows its back, which one photo could not tell us about.
    if (bag.current) bag.current.rotation.y = Math.sin(time * 0.35) * 0.55
    // The whole scene leans gently towards the mouse (parallax)
    if (stage.current) {
      stage.current.rotation.y += (mouse.current.x * 0.18 - stage.current.rotation.y) * 0.04
      stage.current.rotation.x += (mouse.current.y * 0.1 - stage.current.rotation.x) * 0.04
    }
    // The skills travel along their orbits
    spheres.current.forEach((sphere, index) => {
      if (sphere) sphere.position.set(...orbitPosition(index, skills.length, time))
    })
  })

  return (
    <>
      <group ref={stage}>
        <group ref={bag}>
          <primitive object={backpack.group} />
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.665, 0]}>
          <planeGeometry args={[2.1, 1.5]} />
          <meshBasicMaterial map={shadow} transparent depthWrite={false} />
        </mesh>

        {rings.map((points, index) => (
          <Line key={index} points={points} color={palette.line} lineWidth={1} transparent opacity={palette.lineOpacity * 0.8} />
        ))}

        {skills.map((skill, index) => {
          const radius = skillRadius(skill.matching)
          return (
            <group
              key={skill.name}
              ref={(object) => {
                spheres.current[index] = object
              }}
            >
              <mesh>
                <sphereGeometry args={[radius, segments, segments]} />
                <meshStandardMaterial
                  color={skill.matching ? palette.accent : palette.dim}
                  emissive={skill.matching ? palette.accentGlow : palette.dim}
                  emissiveIntensity={skill.matching ? 0.5 : 0.08}
                  roughness={0.4}
                />
              </mesh>
              {/* The glow: a bigger, see-through sphere around a matching skill. Cheaper than a real bloom effect */}
              {skill.matching && (
                <mesh scale={1.9}>
                  <sphereGeometry args={[radius, 12, 12]} />
                  <meshBasicMaterial color={palette.accentGlow} transparent opacity={0.16} depthWrite={false} />
                </mesh>
              )}
            </group>
          )
        })}
      </group>
      <LabelSync objects={spheres} labels={labels} offsets={skills.map((skill) => skillRadius(skill.matching) + 0.06)} clearCentre={0.3} />
    </>
  )
}

// The landing page hero: a leather backpack (the career you carry with you) turning slowly, with skills
// orbiting around it. Loaded lazily (see Lazy3D). pointer-events: none, so it can never block a click or a scroll.
export default function BackpackHero({ active, phone, palette }: SceneProps) {
  const labels = useRef<(HTMLElement | null)[]>([])
  const skills = phone ? HERO_SKILLS_PHONE : HERO_SKILLS
  return (
    <>
      <Canvas
        // Never render more pixels than needed: at most 1.5x (1.25x on phones), even on very sharp screens
        dpr={phone ? [1, 1.25] : [1, 1.5]}
        // "never" stops the render loop while the scene is off-screen or the tab is hidden
        frameloop={active ? 'always' : 'never'}
        gl={{ antialias: !phone, alpha: true, powerPreference: 'low-power' }}
        // Slightly above the bag, looking down at it: the orbits open into ellipses instead of flat lines
        camera={{ position: [0, 1.05, 4.2], fov: 34 }}
        style={{ pointerEvents: 'none' }}
        aria-hidden
      >
        {/* Lit after DESIGN.md: warm paper light from above, sand-coloured bounce from below, one soft warm key,
            and a faint rim in the accent colour (tide) that ties the object to the brand */}
        <hemisphereLight args={['#fffaf2', '#ffe2b8', 1.25]} />
        <directionalLight position={[2.2, 3, 4]} intensity={2.1} color="#fff3e2" />
        <directionalLight position={[-3, 1.5, -2.5]} intensity={1.4} color={palette.accentGlow} />
        <Scene phone={phone} palette={palette} labels={labels} />
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
