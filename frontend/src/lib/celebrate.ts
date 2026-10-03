import confetti from 'canvas-confetti'

// A short burst of confetti for the best news in a job hunt: an offer.
// disableForReducedMotion makes it do nothing for people who asked their system for less motion.
export function celebrateOffer() {
  const colors = ['#c6f432', '#10b981', '#f59e0b', '#1f3a2e', '#ffffff']
  const shared = { particleCount: 60, spread: 70, startVelocity: 45, ticks: 120, colors, disableForReducedMotion: true }
  confetti({ ...shared, angle: 60, origin: { x: 0, y: 0.75 } })
  confetti({ ...shared, angle: 120, origin: { x: 1, y: 0.75 } })
}
