import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, DoubleSide, Plane, Vector3 } from 'three'
import type { Mesh, MeshStandardMaterial } from 'three'
import type { SceneProps } from './support.ts'

const RADIUS = 1
const RED = new Color('#f43f5e')
const YELLOW = new Color('#f59e0b')
const GREEN = new Color('#10b981')

// The same three colors and limits as everywhere else in the app: red below 50, yellow from 50, green from 75.
// While the orb fills, the color blends over the last few points before each limit, so it changes smoothly.
function scoreColor(value: number, target: Color) {
  if (value < 42) return target.copy(RED)
  if (value < 50) return target.lerpColors(RED, YELLOW, (value - 42) / 8)
  if (value < 67) return target.copy(YELLOW)
  if (value < 75) return target.lerpColors(YELLOW, GREEN, (value - 67) / 8)
  return target.copy(GREEN)
}

function Orb({ score, phone }: { score: number; phone: boolean }) {
  const { gl } = useThree()
  const fill = useRef<Mesh>(null)
  const material = useRef<MeshStandardMaterial>(null)
  const progress = useRef(0)
  // Everything above this flat, invisible plane is cut away. Raising the plane "fills" the orb.
  const level = useMemo(() => new Plane(new Vector3(0, -1, 0), -RADIUS), [])
  const segments = phone ? 24 : 40

  useEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])

  // Start filling again when the score changes (a new analysis)
  useEffect(() => {
    progress.current = 0
  }, [score])

  useFrame((_, delta) => {
    // 1.1 seconds from empty to the score, slowing down at the end. Same timing as the number next to it.
    progress.current = Math.min(1, progress.current + delta / 1.1)
    const eased = 1 - Math.pow(1 - progress.current, 3)
    const value = eased * score
    level.constant = -RADIUS + 2 * RADIUS * (value / 100)
    if (material.current) {
      scoreColor(value, material.current.color)
      material.current.emissive.copy(material.current.color)
    }
    if (fill.current) fill.current.rotation.y += delta * 0.4
  })

  return (
    <>
      {/* The glass shell */}
      <mesh>
        <sphereGeometry args={[RADIUS, segments, segments]} />
        <meshStandardMaterial color="#c9d1cc" transparent opacity={0.09} roughness={0.1} depthWrite={false} />
      </mesh>
      {/* The colored fill, cut off at the current level. DoubleSide shows the inside, so it looks solid */}
      <mesh ref={fill}>
        <sphereGeometry args={[RADIUS * 0.93, segments, segments]} />
        <meshStandardMaterial
          ref={material}
          clippingPlanes={[level]}
          side={DoubleSide}
          emissiveIntensity={0.5}
          roughness={0.45}
        />
      </mesh>
    </>
  )
}

// The match score as a glass orb that fills up and turns from red over yellow to green.
// The number itself is normal page text placed over the canvas (see ScoreDisplay), so it stays sharp and readable.
export default function ScoreOrb({ active, phone, score }: SceneProps & { score: number }) {
  return (
    <Canvas
      dpr={phone ? [1, 1.25] : [1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 3.1], fov: 40 }}
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      <ambientLight intensity={0.9} />
      <pointLight position={[2, 3, 4]} intensity={14} />
      <Orb score={score} phone={phone} />
    </Canvas>
  )
}
