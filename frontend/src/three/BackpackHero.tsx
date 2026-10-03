// Only the Line helper is imported, not the whole drei library, to keep the 3D download small
import { Line } from '@react-three/drei/core/Line'
import { Canvas, useFrame } from '@react-three/fiber'
import type { MotionValue } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createBackpack } from './backpack/createBackpack.ts'
import { HERO_SKILLS, HERO_SKILLS_PHONE, ORBITS, orbitPosition } from './galaxyData.ts'
import LabelSync from './Labels.tsx'
import type { SceneProps } from './support.ts'

// All skills start the same size; the analysis step makes matching ones bigger and missing ones smaller
const SKILL_RADIUS = 0.054
// The score of the example the story ends on (the same "strong match" as the first example card)
const STORY_SCORE = 82
const RING_SEGMENTS = 72

// 0 before `from`, 1 after `to`, and a soft S-curve in between
function smooth(value: number, from: number, to: number) {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

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

// The resume: a white sheet with a few grey lines of "text", drawn into a tiny texture
function resumeTexture() {
  const width = 48
  const height = 64
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      // Row 0 is the bottom of the sheet. A wider line near the top is the name; the rest are text lines.
      const fromTop = height - 1 - y
      const heading = fromTop >= 7 && fromTop <= 10 && x >= 6 && x <= 26
      const line = fromTop >= 17 && fromTop <= 54 && fromTop % 6 < 2 && x >= 6 && x <= (fromTop % 18 < 6 ? 30 : 41)
      const value = heading ? 70 : line ? 176 : 250
      data[i] = value
      data[i + 1] = value - 2
      data[i + 2] = value - 6
      data[i + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.needsUpdate = true
  return texture
}

function Scene({
  phone,
  palette,
  labels,
  stage,
  scoreLabel,
  scoreNumber,
}: Pick<SceneProps, 'phone' | 'palette'> & {
  labels: React.RefObject<(HTMLElement | null)[]>
  stage: MotionValue<number>
  scoreLabel: React.RefObject<HTMLDivElement | null>
  scoreNumber: React.RefObject<HTMLSpanElement | null>
}) {
  const lean = useRef<THREE.Group>(null)
  // Everything that moves aside in the last step: the bag, its shadow, the orbits and the skills
  const travel = useRef<THREE.Group>(null)
  const bag = useRef<THREE.Group>(null)
  const paper = useRef<THREE.Mesh>(null)
  const ringLines = useRef<THREE.Group>(null)
  const scoreRing = useRef<THREE.Group>(null)
  const spheres = useRef<(THREE.Object3D | null)[]>([])
  const cores = useRef<(THREE.Mesh | null)[]>([])
  const halos = useRef<(THREE.Mesh | null)[]>([])
  const labelFades = useRef<number[]>([])
  // Where the story is, from 0 (top of the page) to 3 (last step). It follows the scroll position with a
  // little delay, so a jerky scroll wheel still gives a fluid picture.
  const shown = useRef(stage.get())
  const shownScore = useRef(-1)
  // Where the mouse is, from -1 to 1. Followed on the whole window, so the scene reacts even when the
  // mouse is over the text next to it.
  const mouse = useRef({ x: 0, y: 0 })

  const skills = phone ? HERO_SKILLS_PHONE : HERO_SKILLS
  const backpack = useMemo(() => createBackpack(phone ? 'phone' : 'full'), [phone])
  const shadow = useMemo(contactShadowTexture, [])
  const sheet = useMemo(resumeTexture, [])
  const colors = useMemo(
    () => ({ accent: new THREE.Color(palette.accent), dim: new THREE.Color(palette.dim), point: new THREE.Vector3() }),
    [palette],
  )
  // The part of the ring that is filled. Its triangles are stored in order around the circle, so drawing
  // only the first ones shows a ring that is partly full, without building a new shape every frame.
  const fillGeometry = useMemo(() => new THREE.RingGeometry(0.33, 0.42, RING_SEGMENTS, 1, Math.PI / 2, -Math.PI * 2), [])
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
      sheet.dispose()
      fillGeometry.dispose()
    },
    [backpack, shadow, sheet, fillGeometry],
  )

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    shown.current += (stage.get() - shown.current) * Math.min(1, delta * 7)
    const story = shown.current
    // How far each part of the story has played, each from 0 to 1
    // The resume is half way in when step 1 is in the middle of the screen, and gone shortly after
    const upload = smooth(story, 0.3, 1.75)
    const turned = smooth(story, 0.1, 0.6) * (1 - smooth(story, 1.5, 1.95))
    const analysed = smooth(story, 1.5, 2)
    const aside = smooth(story, 2.1, 2.75)
    const filled = smooth(story, 2.4, 3)

    // The bag turns slowly from side to side. It never shows its back, which one photo could not tell us about.
    // Step 1: it turns to a three-quarter view and holds there while the resume goes in.
    if (bag.current) bag.current.rotation.y = Math.sin(time * 0.35) * 0.55 * (1 - 0.8 * turned) - 0.6 * turned
    // The whole scene leans gently towards the mouse (parallax)
    if (lean.current) {
      lean.current.rotation.y += (mouse.current.x * 0.18 - lean.current.rotation.y) * 0.04
      lean.current.rotation.x += (mouse.current.y * 0.1 - lean.current.rotation.x) * 0.04
    }

    // Step 1: the resume appears above the bag and slides down into it
    if (paper.current) {
      const visible = story > 0.1 && upload < 0.995
      paper.current.visible = visible
      if (visible) {
        paper.current.position.y = 1.0 - 0.82 * upload
        paper.current.rotation.z = 0.2 * (1 - upload)
        ;(paper.current.material as THREE.MeshStandardMaterial).opacity = smooth(story, 0.1, 0.3)
      }
    }

    // Step 2: the orbits tighten around the bag
    const tighten = 1 - 0.3 * analysed
    if (ringLines.current) ringLines.current.scale.setScalar(tighten)
    spheres.current.forEach((sphere, index) => {
      if (!sphere) return
      const [x, y, z] = orbitPosition(index, skills.length, time)
      sphere.position.set(x * tighten, y * tighten, z * tighten)
      // ...matching skills grow and glow, missing skills shrink and fade
      const matching = skills[index].matching
      sphere.scale.setScalar(matching ? 1 + 0.3 * analysed : 1 - 0.25 * analysed)
      const core = cores.current[index]?.material as THREE.MeshStandardMaterial | undefined
      const halo = halos.current[index]?.material as THREE.MeshBasicMaterial | undefined
      if (core) {
        if (matching) core.emissiveIntensity = 0.25 + 0.5 * analysed
        else {
          core.color.copy(colors.accent).lerp(colors.dim, analysed)
          core.emissive.copy(core.color)
          core.opacity = 1 - 0.65 * analysed
        }
      }
      if (halo) halo.opacity = 0.2 * analysed
      // The names of missing skills fade with them; all names fade when the bag moves aside
      labelFades.current[index] = (matching ? 1 : 1 - 0.6 * analysed) * (1 - aside)
    })

    // Step 3: the bag moves aside and gets smaller, the score ring appears and fills
    if (travel.current) {
      travel.current.position.x = (phone ? -0.56 : -0.62) * aside
      travel.current.scale.setScalar(1 - 0.38 * aside)
    }
    if (scoreRing.current) {
      scoreRing.current.visible = aside > 0.01
      scoreRing.current.scale.setScalar(0.6 + 0.4 * aside)
      fillGeometry.setDrawRange(0, Math.round((STORY_SCORE / 100) * filled * RING_SEGMENTS) * 6)
      // The number in the ring is ordinary page text, moved to where the ring is on the screen
      if (scoreLabel.current) {
        scoreRing.current.getWorldPosition(colors.point).project(state.camera)
        const x = (colors.point.x * 0.5 + 0.5) * state.size.width
        const y = (-colors.point.y * 0.5 + 0.5) * state.size.height
        scoreLabel.current.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        scoreLabel.current.style.opacity = String(aside)
      }
      const score = Math.round(STORY_SCORE * filled)
      if (scoreNumber.current && score !== shownScore.current) {
        shownScore.current = score
        scoreNumber.current.textContent = String(score)
      }
    }
  })

  return (
    <>
      <group ref={lean}>
        <group ref={travel}>
          <group ref={bag}>
            <primitive object={backpack.group} />
            <mesh ref={paper} visible={false} position={[0, 1, 0.02]}>
              <planeGeometry args={[0.4, 0.53]} />
              <meshStandardMaterial map={sheet} side={THREE.DoubleSide} transparent roughness={0.9} />
            </mesh>
          </group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.665, 0]}>
            <planeGeometry args={[2.1, 1.5]} />
            <meshBasicMaterial map={shadow} transparent depthWrite={false} />
          </mesh>

          <group ref={ringLines}>
            {rings.map((points, index) => (
              <Line key={index} points={points} color={palette.line} lineWidth={1} transparent opacity={palette.lineOpacity * 0.8} />
            ))}
          </group>

          {skills.map((skill, index) => (
            <group
              key={skill.name}
              ref={(object) => {
                spheres.current[index] = object
              }}
            >
              <mesh
                ref={(mesh) => {
                  cores.current[index] = mesh
                }}
              >
                <sphereGeometry args={[SKILL_RADIUS, segments, segments]} />
                <meshStandardMaterial color={palette.accent} emissive={palette.accentGlow} emissiveIntensity={0.25} roughness={0.4} transparent={!skill.matching} />
              </mesh>
              {/* The glow: a bigger, see-through sphere around a matching skill. Cheaper than a real bloom effect */}
              {skill.matching && (
                <mesh
                  scale={1.9}
                  ref={(mesh) => {
                    halos.current[index] = mesh
                  }}
                >
                  <sphereGeometry args={[SKILL_RADIUS, 12, 12]} />
                  <meshBasicMaterial color={palette.accentGlow} transparent opacity={0} depthWrite={false} />
                </mesh>
              )}
            </group>
          ))}
        </group>

        {/* The score ring of the last step: a pale track and, on top of it, the part that is filled */}
        <group ref={scoreRing} visible={false} position={[phone ? 0.62 : 0.66, 0.08, 0]} rotation={[-0.24, 0, 0]}>
          <mesh>
            <ringGeometry args={[0.33, 0.42, RING_SEGMENTS]} />
            <meshBasicMaterial color={palette.dim} transparent opacity={0.45} />
          </mesh>
          <mesh geometry={fillGeometry} position={[0, 0, 0.005]}>
            <meshBasicMaterial color={palette.good} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
      <LabelSync objects={spheres} labels={labels} offsets={skills.map(() => SKILL_RADIUS + 0.07)} clearCentre={0.3} fades={labelFades} />
    </>
  )
}

// The landing page hero: a leather backpack (the career you carry with you) turning slowly, with skills
// orbiting around it. Scrolling through "How it works" plays a short story with it: the resume goes into the
// bag, the skills are sorted, the score appears. Loaded lazily (see Lazy3D). pointer-events: none, so it can
// never block a click or a scroll.
export default function BackpackHero({ active, phone, palette, stage }: SceneProps & { stage: MotionValue<number> }) {
  const labels = useRef<(HTMLElement | null)[]>([])
  const scoreLabel = useRef<HTMLDivElement>(null)
  const scoreNumber = useRef<HTMLSpanElement>(null)
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
        <Scene phone={phone} palette={palette} labels={labels} stage={stage} scoreLabel={scoreLabel} scoreNumber={scoreNumber} />
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
            className="absolute left-0 top-0 whitespace-nowrap rounded-full border bg-card/85 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm will-change-transform"
          >
            {skill.name}
          </span>
        ))}
        {/* The score inside the ring of the last step */}
        <div ref={scoreLabel} className="absolute left-0 top-0 flex flex-col items-center opacity-0 will-change-transform" data-story-score>
          <span ref={scoreNumber} className="text-3xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">
            0
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">out of 100</span>
        </div>
      </div>
    </>
  )
}
