import { motion } from 'motion/react'
import { Button } from './ui/button.tsx'

// The shadcn Button, plus a small "press" reaction: it shrinks a little while it is held down
const MotionBase = motion.create(Button)

export default function MotionButton(props: React.ComponentProps<typeof MotionBase>) {
  return <MotionBase whileTap={{ scale: 0.96 }} transition={{ duration: 0.1 }} {...props} />
}
