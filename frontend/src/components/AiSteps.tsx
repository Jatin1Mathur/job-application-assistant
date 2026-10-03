import { Check, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

// Shown while the AI is working. The steps light up one after another so the wait feels shorter.
// They are an illustration of what the AI does; the backend sends one answer at the end.
export default function AiSteps({ steps }: { steps: string[] }) {
  const [active, setActive] = useState(0)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Move to the next step every 3 seconds and stay on the last one until the answer arrives
  useEffect(() => {
    if (active >= steps.length - 1) return
    const timer = setTimeout(() => setActive(active + 1), 3000)
    return () => clearTimeout(timer)
  }, [active, steps.length])

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
      role="status"
    >
      <div className="mt-5 rounded-xl border border-primary/15 bg-accent/60 p-4">
        <ul className="space-y-2.5">
          {steps.map((step, index) => {
            const done = index < active
            const current = index === active
            return (
              <motion.li
                key={step}
                animate={{ opacity: done || current ? 1 : 0.45 }}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : current
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={done ? 'done' : current ? 'current' : 'waiting'}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      {done ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : current ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <span className="text-xs font-semibold">{index + 1}</span>
                      )}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className={current ? 'font-medium text-foreground' : 'text-muted-foreground'}>{step}</span>
              </motion.li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">This can take up to 60 seconds · {seconds}s so far</p>
      </div>
    </motion.div>
  )
}
