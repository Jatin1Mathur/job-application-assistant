import { animate, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { scoreTone } from '../lib/format.ts'

const SIZES = {
  lg: { box: 'size-36', radius: 52, stroke: 10, number: 'text-4xl', showMax: true },
  sm: { box: 'size-12', radius: 19, stroke: 4.5, number: 'text-sm', showMax: false },
}

// The match score as a circle that fills up while the number counts from 0 to the score.
// The color depends on the score: red (weak), yellow (medium), green (strong).
export default function ScoreRing({ score, size = 'lg' }: { score: number; size?: keyof typeof SIZES }) {
  const { box, radius, stroke, number, showMax } = SIZES[size]
  const reducedMotion = useReducedMotion()
  const [shown, setShown] = useState(reducedMotion ? score : 0)
  const tone = scoreTone(score)
  const circumference = 2 * Math.PI * radius
  const center = radius + stroke

  // Count the number up from 0. With "reduce motion" switched on, jump straight to the score.
  useEffect(() => {
    if (reducedMotion) {
      setShown(score)
      return
    }
    const controls = animate(0, score, {
      duration: 1.1,
      ease: 'easeOut',
      onUpdate: (value) => setShown(Math.round(value)),
    })
    return () => controls.stop()
  }, [score, reducedMotion])

  return (
    <div className={`relative shrink-0 ${box}`} role="img" aria-label={`Match score ${score} out of 100`}>
      <svg viewBox={`0 0 ${center * 2} ${center * 2}`} className="size-full -rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={tone.stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reducedMotion ? circumference * (1 - score / 100) : circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: reducedMotion ? 0 : 1.1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold tabular-nums tracking-tight ${number} ${tone.text}`} data-testid="score">
          {shown}
        </span>
        {showMax && <span className="text-xs font-medium text-muted-foreground">out of 100</span>}
      </div>
    </div>
  )
}
