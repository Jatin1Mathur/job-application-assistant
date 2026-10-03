import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

// A number that counts quickly to its new value instead of jumping.
// Screen readers get the final value at once; with "reduce motion" there is no counting.
export default function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const reducedMotion = useReducedMotion()
  const [shown, setShown] = useState(reducedMotion ? value : 0)
  const previous = useRef(reducedMotion ? value : 0)

  useEffect(() => {
    if (reducedMotion) {
      setShown(value)
      previous.current = value
      return
    }
    const controls = animate(previous.current, value, {
      duration: 0.35,
      ease: 'easeOut',
      onUpdate: (current) => setShown(current),
    })
    previous.current = value
    return () => controls.stop()
  }, [value, reducedMotion])

  return (
    // relative: keeps the hidden screen-reader copy anchored here, so it cannot widen a scrolling parent
    <span className="relative tabular-nums">
      <span aria-hidden>{shown.toFixed(decimals)}</span>
      <span className="sr-only">{value.toFixed(decimals)}</span>
    </span>
  )
}
