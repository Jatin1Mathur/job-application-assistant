import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import type { PointerEvent, ReactNode } from 'react'

const MAX_TILT = 5 // degrees

// A subtle 3D tilt: the card leans a few degrees towards the mouse. Pure CSS transforms, no WebGL.
// Off for touch (there is no hover) and for "reduce motion".
export default function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion()
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  // The spring makes the card follow the mouse softly instead of snapping
  const rotateX = useSpring(tiltX, { stiffness: 260, damping: 22 })
  const rotateY = useSpring(tiltY, { stiffness: 260, damping: 22 })

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reducedMotion || event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    // -0.5 at one edge, 0 in the middle, 0.5 at the other edge
    const x = (event.clientX - box.left) / box.width - 0.5
    const y = (event.clientY - box.top) / box.height - 0.5
    tiltY.set(x * 2 * MAX_TILT)
    tiltX.set(-y * 2 * MAX_TILT)
  }

  function reset() {
    tiltX.set(0)
    tiltY.set(0)
  }

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      // Flat again before the card grows into the detail page
      onPointerDown={reset}
    >
      {children}
    </motion.div>
  )
}
