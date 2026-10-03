import { ArrowRight, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { staggerItem, staggerList } from '../lib/motion.ts'

export interface OnboardingState {
  hasResume: boolean
  hasApplication: boolean
  hasAnalysis: boolean
  // Where "Run first analysis" leads: the first application, once there is one
  firstApplicationId: number | null
}

// Three first steps for a new user. Each step is ticked off as soon as it is really done.
export default function OnboardingChecklist({ state }: { state: OnboardingState }) {
  const steps = [
    {
      done: state.hasResume,
      title: 'Upload your resume',
      text: 'A PDF is enough. The AI reads its text.',
      to: '/resumes',
    },
    {
      done: state.hasApplication,
      title: 'Create your first application',
      text: 'Paste the job posting you want to apply for.',
      to: '/applications/new',
    },
    {
      done: state.hasAnalysis,
      title: 'Run your first analysis',
      text: 'See your match score, missing skills and tips.',
      to: state.firstApplicationId === null ? null : `/applications/${state.firstApplicationId}`,
    },
  ]
  const doneCount = steps.filter((step) => step.done).length
  // The first step that is still open is the one to do next
  const nextIndex = steps.findIndex((step) => !step.done)

  return (
    <section aria-label="Getting started" className="rounded-2xl border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Get started in three steps</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{doneCount} of 3 done</p>
        </div>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-brand ring-1 ring-inset ring-foreground/15"
            initial={{ width: 0 }}
            animate={{ width: `${(doneCount / 3) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
      <motion.ol variants={staggerList} initial="hidden" animate="show" className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => {
          const isNext = index === nextIndex
          const body = (
            <>
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done
                    ? 'bg-emerald-500 text-white'
                    : isNext
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.done ? <Check className="size-4" strokeWidth={3} /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${step.done ? 'text-muted-foreground line-through' : ''}`}>
                  {step.title}
                </span>
                <span className="block text-xs text-muted-foreground">{step.text}</span>
              </span>
              {isNext && step.to && <ArrowRight className="size-4 shrink-0 text-primary" />}
            </>
          )
          const box = `flex h-full items-center gap-3 rounded-xl border p-4 ${
            isNext ? 'border-primary/40 bg-accent/50' : 'bg-background/50'
          }`
          return (
            <motion.li key={step.title} variants={staggerItem} data-done={step.done}>
              {!step.done && step.to ? (
                <Link to={step.to} className={`${box} transition-shadow hover:shadow-raised`}>
                  {body}
                </Link>
              ) : (
                <div className={box}>{body}</div>
              )}
            </motion.li>
          )
        })}
      </motion.ol>
    </section>
  )
}
