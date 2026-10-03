import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { Dashboard } from '../../api.ts'
import { staggerItem, staggerList } from '../../lib/motion.ts'
import AnimatedNumber from '../AnimatedNumber.tsx'
import Sparkline from './Sparkline.tsx'

function StatCard({ label, value, caption, trend, trendLabel, testId }: { label: string; value: ReactNode; caption: string; trend: (number | null)[]; trendLabel: string; testId: string }) {
  return (
    <motion.li variants={staggerItem} className="rounded-xl border bg-card p-4 sm:p-5" data-testid={testId}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="font-display text-3xl font-semibold leading-none tabular-nums sm:text-4xl">{value}</p>
        <Sparkline values={trend} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
      {/* The sparkline in words */}
      <p className="sr-only">
        {trendLabel}: {trend.map((point) => (point === null ? 'none' : point)).join(', ')}
      </p>
    </motion.li>
  )
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

// Four numbers about the job search, each with the shape of its last twelve weeks.
// A number that cannot be calculated yet is not shown as 0: the card says what is missing instead.
export default function StatCards({ dashboard }: { dashboard: Dashboard }) {
  const { weeks } = dashboard
  const thisWeek = weeks.at(-1)
  return (
    <motion.ul variants={staggerList} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Your numbers">
      <StatCard
        testId="stat-applications"
        label="Applications"
        value={<AnimatedNumber value={dashboard.totalApplications} />}
        caption={`${thisWeek?.created ?? 0} added this week`}
        trend={weeks.map((week) => week.created)}
        trendLabel="Applications added per week, last 12 weeks"
      />
      <StatCard
        testId="stat-sent"
        label="Sent"
        value={<AnimatedNumber value={dashboard.appliedApplications} />}
        caption={`of ${plural(dashboard.totalApplications, 'application')}`}
        trend={weeks.map((week) => week.applied)}
        trendLabel="Applications sent per week, last 12 weeks"
      />
      <StatCard
        testId="stat-interview-rate"
        label="Interview rate"
        value={
          dashboard.interviewRate === null ? (
            <span className="font-sans text-base font-medium text-muted-foreground">No data yet</span>
          ) : (
            <>
              <AnimatedNumber value={Math.round(dashboard.interviewRate)} />
              <span className="text-xl">%</span>
            </>
          )
        }
        caption={
          dashboard.interviewRate === null
            ? 'Shown once an application is sent'
            : `${dashboard.interviewApplications} of ${dashboard.appliedApplications} sent led to an interview`
        }
        trend={weeks.map((week) => week.interviews)}
        trendLabel="Interview invitations per week, last 12 weeks"
      />
      <StatCard
        testId="stat-average-score"
        label="Average match"
        value={
          dashboard.averageScore === null ? (
            <span className="font-sans text-base font-medium text-muted-foreground">No data yet</span>
          ) : (
            <AnimatedNumber value={Math.round(dashboard.averageScore)} />
          )
        }
        caption={dashboard.averageScore === null ? 'Shown once an application is analyzed' : `out of 100, from ${dashboard.analyzedApplications} ${dashboard.analyzedApplications === 1 ? 'analysis' : 'analyses'}`}
        trend={weeks.map((week) => week.averageScore)}
        trendLabel="Average match score per week, last 12 weeks"
      />
    </motion.ul>
  )
}
