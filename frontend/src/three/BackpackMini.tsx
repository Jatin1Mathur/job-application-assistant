import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type * as THREE from 'three'
import { createBackpack } from './backpack/createBackpack.ts'
import type { SceneProps } from './support.ts'

function Bag() {
  const bag = useRef<THREE.Group>(null)
  // The low-detail version: this bag is small on the screen
  const backpack = useMemo(() => createBackpack('phone'), [])

  useEffect(() => () => backpack.dispose(), [backpack])

  useFrame((state) => {
    if (!bag.current) return
    const time = state.clock.elapsedTime
    // The same slow turn from side to side as on the landing page, and a small rise and fall
    bag.current.rotation.y = Math.sin(time * 0.4) * 0.5
    bag.current.position.y = Math.sin(time * 0.8) * 0.03
  })

  return (
    <group ref={bag}>
      <primitive object={backpack.group} />
    </group>
  )
}

// The small backpack on the login and register pages. Only the bag: no orbits, no labels.
// Loaded lazily and paused when hidden (see Lazy3D); it never receives clicks.
export default function BackpackMini({ active, palette }: SceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0.7, 3.5], fov: 30 }}
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      <hemisphereLight args={['#fffaf2', '#ffe2b8', 1.3]} />
      <directionalLight position={[2.2, 3, 4]} intensity={2.2} color="#fff3e2" />
      <directionalLight position={[-3, 1.5, -2.5]} intensity={1.6} color={palette.accentGlow} />
      <Bag />
    </Canvas>
  )
}
