import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { finePointer } from '../../lib/pointer.ts'

// Makes its child lean a few pixels towards the mouse while the mouse is over it, like a weak magnet.
// Switched off on touch devices and with "reduce motion": there the child is rendered as it is.
export default function Magnetic({ children, strength = 0.22 }: { children: ReactNode; strength?: number }) {
  const reducedMotion = useReducedMotion()
  const [enabled] = useState(finePointer)
  // Motion values change the transform directly, without re-rendering React on every mouse move
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 })
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 })

  if (!enabled || reducedMotion) {
    return <>{children}</>
  }

  function follow(event: PointerEvent<HTMLSpanElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - (box.left + box.width / 2)) * strength)
    y.set((event.clientY - (box.top + box.height / 2)) * strength)
  }

  function release() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.span className="inline-block" style={{ x, y }} onPointerMove={follow} onPointerLeave={release} data-magnetic>
      {children}
    </motion.span>
  )
}
