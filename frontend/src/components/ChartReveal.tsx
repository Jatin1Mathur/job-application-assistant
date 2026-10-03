import { motion } from 'motion/react'
import type { ReactNode } from 'react'

// Makes a chart grow in when it scrolls into view: columns rise from the baseline, bars grow from the left.
// It runs once and is short. With "reduce motion" only the fade remains (see MotionConfig in main.tsx).
export default function ChartReveal({
  direction,
  children,
  className,
  style,
  ...rest
}: {
  direction: 'up' | 'right'
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  'data-testid'?: string
}) {
  const hidden = direction === 'up' ? { opacity: 0, scaleY: 0.2 } : { opacity: 0, scaleX: 0.2 }
  return (
    <motion.div
      {...rest}
      className={className}
      style={{ ...style, transformOrigin: direction === 'up' ? 'bottom' : 'left' }}
      initial={hidden}
      whileInView={{ opacity: 1, scaleX: 1, scaleY: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
