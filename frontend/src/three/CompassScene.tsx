import { Canvas, useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SceneProps } from './support.ts'

const TICKS = 60
const INK = '#1e1a14'
const PAPER = '#f9f6f1'
const SAND = '#ffeccd'

// The marks around the dial: one every 6 degrees, longer at every 30, longest at the four directions.
// One instanced mesh, so 60 marks cost one draw call.
function Ticks() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!mesh.current) return
    const place = new THREE.Object3D()
    for (let i = 0; i < TICKS; i++) {
      const angle = (i / TICKS) * Math.PI * 2
      const length = i % 15 === 0 ? 0.2 : i % 5 === 0 ? 0.13 : 0.07
      const radius = 0.86 - length / 2
      place.position.set(Math.sin(angle) * radius, 0.092, -Math.cos(angle) * radius)
      place.rotation.set(0, -angle, 0)
      place.scale.set(i % 15 === 0 ? 1.8 : 1, 1, length)
      place.updateMatrix()
      mesh.current.setMatrixAt(i, place.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, TICKS]}>
      <boxGeometry args={[0.014, 0.006, 1]} />
      <meshStandardMaterial color={INK} roughness={0.8} />
    </instancedMesh>
  )
}

// The letter N, built from three thin bars, lying on the dial at the north mark
function LetterN({ color }: { color: string }) {
  const material = <meshStandardMaterial color={color} roughness={0.6} />
  return (
    <group position={[0, 0.094, -0.52]}>
      <mesh position={[-0.055, 0, 0]}>
        <boxGeometry args={[0.028, 0.008, 0.17]} />
        {material}
      </mesh>
      <mesh position={[0.055, 0, 0]}>
        <boxGeometry args={[0.028, 0.008, 0.17]} />
        {material}
      </mesh>
      <mesh rotation={[0, 0.6, 0]}>
        <boxGeometry args={[0.028, 0.008, 0.2]} />
        {material}
      </mesh>
    </group>
  )
}

function Compass({ north, accent }: { north: boolean; accent: string }) {
  const body = useRef<THREE.Group>(null)
  const needle = useRef<THREE.Group>(null)
  // Where the needle points (0 is north) and how fast it is turning
  const motion = useRef({ angle: 0.9, speed: 0 })

  // The two halves of the needle: flat diamonds, pointed at the far end
  const half = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.07, 0)
    shape.lineTo(0, 0.62)
    shape.lineTo(0.07, 0)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false })
  }, [])
  useLayoutEffect(() => () => half.dispose(), [half])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const step = Math.min(delta, 0.05)
    // Before login the needle searches: it drifts around a direction that is not north.
    // After a successful login it is pulled to north like a needle on a spring, with a small overshoot.
    const target = north ? 0 : 0.9 + Math.sin(time * 0.7) * 0.45 + Math.sin(time * 1.9) * 0.12
    const pull = north ? 70 : 14
    const drag = north ? 9 : 5
    motion.current.speed += (-pull * (motion.current.angle - target) - drag * motion.current.speed) * step
    motion.current.angle += motion.current.speed * step
    if (needle.current) needle.current.rotation.y = -motion.current.angle
    // The whole compass floats a little, as if held in a hand
    if (body.current) {
      body.current.rotation.z = Math.sin(time * 0.6) * 0.04
      body.current.position.y = Math.sin(time * 0.9) * 0.03
    }
  })

  return (
    <group ref={body} rotation={[0.95, 0, 0]}>
      {/* The case: a flat cylinder with a slightly wider rim */}
      <mesh>
        <cylinderGeometry args={[1, 1, 0.16, 64]} />
        <meshStandardMaterial color={SAND} roughness={0.45} metalness={0.15} />
      </mesh>
      {/* A torus stands upright by default; turned by a quarter it lies flat around the dial */}
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.97, 0.05, 12, 64]} />
        <meshStandardMaterial color={SAND} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* The dial */}
      <mesh position={[0, 0.083, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.012, 64]} />
        <meshStandardMaterial color={PAPER} roughness={0.9} />
      </mesh>
      <Ticks />
      <LetterN color={accent} />

      {/* The needle: the north half in the accent colour, the south half in ink */}
      <group ref={needle} position={[0, 0.13, 0]}>
        <mesh geometry={half} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <meshStandardMaterial color={accent} roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh geometry={half} rotation={[-Math.PI / 2, 0, Math.PI]} position={[0, -0.01, 0]}>
          <meshStandardMaterial color={INK} roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 24]} />
          <meshStandardMaterial color={SAND} roughness={0.3} metalness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

// The compass on the login and register pages, built from simple shapes in code. Its needle wanders until the
// login succeeds, then it swings to north. Loaded lazily and paused when hidden (see Lazy3D); never receives clicks.
export default function CompassScene({ active, north }: SceneProps & { north: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0.25, 3.6], fov: 34 }}
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      <hemisphereLight args={['#fffaf2', '#ffe2b8', 1.4]} />
      <directionalLight position={[2.2, 3, 4]} intensity={2.2} color="#fff3e2" />
      <directionalLight position={[-3, 1.5, -2.5]} intensity={1.2} color="#77ced8" />
      {/* On the dark teal panel the lighter tide reads better than the dark one */}
      <Compass north={north} accent="#006375" />
    </Canvas>
  )
}
