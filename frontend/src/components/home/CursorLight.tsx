import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { finePointer } from '../../lib/pointer.ts'

// A soft patch of light that follows the mouse inside its parent element. Decoration only.
// Not rendered on touch devices or with "reduce motion". The parent must be positioned (relative).
export default function CursorLight() {
  const reducedMotion = useReducedMotion()
  const [enabled] = useState(finePointer)
  const anchor = useRef<HTMLDivElement>(null)
  const x = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 })
  const y = useSpring(useMotionValue(0), { stiffness: 90, damping: 20 })
  const opacity = useSpring(useMotionValue(0), { stiffness: 60, damping: 20 })

  const active = enabled && !reducedMotion

  useEffect(() => {
    const parent = anchor.current?.parentElement
    if (!active || !parent) return
    const move = (event: PointerEvent) => {
      const box = parent.getBoundingClientRect()
      x.set(event.clientX - box.left)
      y.set(event.clientY - box.top)
      opacity.set(1)
    }
    const leave = () => opacity.set(0)
    parent.addEventListener('pointermove', move)
    parent.addEventListener('pointerleave', leave)
    return () => {
      parent.removeEventListener('pointermove', move)
      parent.removeEventListener('pointerleave', leave)
    }
  }, [active, x, y, opacity])

  if (!active) return null

  return (
    <div ref={anchor} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" data-cursor-light>
      <motion.div
        className="absolute -left-56 -top-56 size-[28rem] rounded-full bg-[radial-gradient(closest-side,var(--encourage),transparent)] opacity-0 dark:bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--primary)_22%,transparent),transparent)]"
        style={{ x, y, opacity }}
      />
    </div>
  )
}
