import type { Variants } from 'motion/react'

// Shared animation settings, so every page moves the same way. All of them are short and subtle.

// A list whose children appear one after another
export const staggerList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

// One item of such a list: fades in while sliding up a little
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

// A skill tag "popping" in
export const popItem: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 26 } },
}
