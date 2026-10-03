import { animate, useReducedMotion } from 'motion/react'
import { lazy, useEffect, useState } from 'react'
import { scoreTone } from '../lib/format.ts'
import Lazy3D from './Lazy3D.tsx'
import ScoreRing from './ScoreRing.tsx'

// The 3D code is only downloaded when a score orb is really shown
const ScoreOrb = lazy(() => import('../three/ScoreOrb.tsx'))

// The number in the middle of the orb. It is normal text, so it is sharp, selectable and readable by a screen reader.
function OrbNumber({ score }: { score: number }) {
  const reducedMotion = useReducedMotion()
  const [shown, setShown] = useState(reducedMotion ? score : 0)

  useEffect(() => {
    if (reducedMotion) {
      setShown(score)
      return
    }
    const controls = animate(0, score, { duration: 1.1, ease: 'easeOut', onUpdate: (value) => setShown(Math.round(value)) })
    return () => controls.stop()
  }, [score, reducedMotion])

  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {/* The solid background keeps the number readable whatever color the orb has behind it */}
      <span className="flex flex-col items-center rounded-xl bg-card/90 px-2 py-0.5 shadow-card backdrop-blur-sm">
        <span className={`text-2xl font-bold leading-tight tabular-nums tracking-tight ${scoreTone(score).text}`} data-testid="score">
          {shown}
        </span>
        <span className="text-[10px] font-medium leading-tight text-muted-foreground">out of 100</span>
      </span>
    </span>
  )
}

// The big score of an analysis. With WebGL it is a 3D orb that fills up; otherwise the 2D ring
// (which is also what you see for the short moment while the 3D code loads).
export default function ScoreDisplay({ score }: { score: number }) {
  return (
    <Lazy3D
      label={`Match score ${score} out of 100`}
      className="relative size-36 shrink-0"
      fallback={<ScoreRing score={score} />}
      scene={(props) => (
        <>
          <ScoreOrb {...props} score={score} />
          <OrbNumber score={score} />
        </>
      )}
    />
  )
}
