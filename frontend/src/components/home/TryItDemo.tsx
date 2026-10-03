import { Loader2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { scoreTone } from '../../lib/format.ts'
import { popItem, staggerList } from '../../lib/motion.ts'
import MotionButton from '../MotionButton.tsx'
import ScoreRing from '../ScoreRing.tsx'
import Magnetic from './Magnetic.tsx'
import { SAMPLE_JOBS, SAMPLE_RESUME_LINE } from './sampleData.ts'

type Phase = 'idle' | 'working' | 'done'

// "Try it now": the visitor picks one of three sample jobs and presses Analyze. The result is sample
// data that was written by hand (see sampleData.ts), not an answer of the AI model, and the page says so.
export default function TryItDemo() {
  const reducedMotion = useReducedMotion()
  const [jobId, setJobId] = useState(SAMPLE_JOBS[0].id)
  const [phase, setPhase] = useState<Phase>('idle')
  const job = SAMPLE_JOBS.find((candidate) => candidate.id === jobId) ?? SAMPLE_JOBS[0]
  const tone = scoreTone(job.score)

  // A short pause before the result, so the change is noticed. It is not a real computation.
  useEffect(() => {
    if (phase !== 'working') return
    const timer = setTimeout(() => setPhase('done'), reducedMotion ? 0 : 900)
    return () => clearTimeout(timer)
  }, [phase, reducedMotion])

  function pick(id: string) {
    setJobId(id)
    setPhase('idle')
  }

  return (
    <section id="try" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-20 sm:px-6" aria-labelledby="try-heading">
      <h2 id="try-heading" className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
        Try it now, without an account
      </h2>
      <p className="mt-4 max-w-[60ch] leading-relaxed text-muted-foreground">
        Pick a sample job and press Analyze. This demo uses prepared sample data, so you see the kind of result the
        app gives. With an account, the AI model compares your own resume.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
        <div>
          <fieldset>
            <legend className="text-sm font-medium">Pick a sample job</legend>
            <div className="mt-3 space-y-2.5">
              {SAMPLE_JOBS.map((option) => (
                <label
                  key={option.id}
                  className="flex min-h-11 cursor-pointer gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/60 has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="radio"
                    name="sample-job"
                    value={option.id}
                    checked={option.id === jobId}
                    onChange={() => pick(option.id)}
                    className="mt-1 size-4 shrink-0 accent-(--primary)"
                  />
                  <span>
                    <span className="block font-semibold">
                      {option.title} <span className="font-normal text-muted-foreground">at {option.company}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{option.posting}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="mt-4 text-sm text-muted-foreground">{SAMPLE_RESUME_LINE}</p>
          <div className="mt-5">
            <Magnetic>
              <MotionButton className="h-12 px-6 text-base" disabled={phase === 'working'} onClick={() => setPhase('working')} data-testid="demo-analyze">
                {phase === 'working' && <Loader2 className="animate-spin" />}
                Analyze
              </MotionButton>
            </Magnetic>
          </div>
        </div>

        {/* The result. aria-live: screen readers hear the result when it appears */}
        <div className="rounded-2xl border bg-card p-6 sm:p-7" aria-live="polite" data-testid="demo-result" data-phase={phase}>
          <p className="inline-flex rounded-md bg-encourage px-2 py-1 text-xs font-semibold text-encourage-foreground">
            Sample result, not a live analysis
          </p>
          <AnimatePresence mode="wait" initial={false}>
            {phase === 'done' ? (
              <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <p className="mt-4 text-base font-semibold">
                  {job.title} at {job.company}
                </p>
                <div className="mt-4 flex items-center gap-5">
                  <ScoreRing score={job.score} />
                  <div>
                    <p className={`text-lg font-semibold ${tone.text}`}>{tone.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {job.matching.length} matching and {job.missing.length} missing skills.
                    </p>
                  </div>
                </div>
                <motion.ul variants={staggerList} initial="hidden" animate="show" className="mt-5 flex flex-wrap gap-2" aria-label="Skills">
                  {job.matching.map((skill) => (
                    <motion.li
                      key={skill}
                      variants={popItem}
                      className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300"
                    >
                      <span className="sr-only">Matching: </span>
                      {skill}
                    </motion.li>
                  ))}
                  {job.missing.map((skill) => (
                    <motion.li
                      key={skill}
                      variants={popItem}
                      className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-500/25 dark:text-rose-300"
                    >
                      <span className="sr-only">Missing: </span>
                      {skill}
                    </motion.li>
                  ))}
                </motion.ul>
                <p className="mt-5 border-t pt-4 text-sm leading-relaxed">
                  <span className="font-semibold">One of three tips: </span>
                  {job.tip}
                </p>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex min-h-64 flex-col items-center justify-center text-center">
                {phase === 'working' ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="size-4 animate-spin" /> Loading the sample result
                  </p>
                ) : (
                  <>
                    <p className="font-semibold">
                      {job.title} at {job.company}
                    </p>
                    <p className="mt-1 max-w-xs text-sm text-muted-foreground">Press Analyze to see the score, the matching skills and the missing skills.</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
