import { BarChart3, Lightbulb, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, errorMessage, STATUSES } from '../api.ts'
import type { Insights } from '../api.ts'
import AnimatedNumber from '../components/AnimatedNumber.tsx'
import ChartReveal from '../components/ChartReveal.tsx'
import EmptyState from '../components/EmptyState.tsx'
import ErrorAlert from '../components/ErrorAlert.tsx'
import MotionButton from '../components/MotionButton.tsx'
import PageTransition from '../components/PageTransition.tsx'
import ScoreRing from '../components/ScoreRing.tsx'
import SkillUniverseSection from '../components/SkillUniverseSection.tsx'
import { Skeleton } from '../components/ui/skeleton.tsx'
import { scoreTone } from '../lib/format.ts'
import { statusLabel } from '../lib/status.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

const card = 'rounded-xl border bg-card p-6'

// Chart text and grid lines use the theme's colors, so they are right in light and dark mode
const axisTick = { fill: 'var(--muted-foreground)', fontSize: 12 }
const valueLabel = { fill: 'var(--foreground)', fontSize: 12, fontWeight: 600 }

// The top of the axis: the biggest value, but at least 1 and at most 6 steps so the ticks stay whole numbers
function wholeNumberMax(rows: { value: number }[]): number {
  const max = Math.max(1, ...rows.map((row) => row.value))
  return max <= 6 ? max : Math.ceil(max / 5) * 5
}

function ChartTooltip({ active, payload, unit }: { active?: boolean; payload?: { value: number; payload: { name: string } }[]; unit: string }) {
  if (!active || !payload?.length) return null
  const { value, payload: row } = payload[0]
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-popover-foreground">{row.name}</p>
      <p className="text-muted-foreground">
        {value} {value === 1 ? unit : `${unit}s`}
      </p>
    </div>
  )
}

// The same numbers as a table for screen readers, since a chart alone cannot be read aloud
function HiddenTable({ caption, rows, valueHeader }: { caption: string; rows: { name: string; value: number }[]; valueHeader: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Name</th>
          <th>{valueHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td>{row.name}</td>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function InsightsPage() {
  usePageTitle('Insights')
  const [insights, setInsights] = useState<Insights | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getInsights()
      .then(setInsights)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  if (error) {
    return (
      <PageTransition>
        <ErrorAlert message={error} />
      </PageTransition>
    )
  }

  if (!insights) {
    return (
      <PageTransition>
        <div aria-busy="true" aria-label="Loading insights">
          <Skeleton className="h-8 w-40" />
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-80 rounded-xl lg:col-span-3" />
          </div>
        </div>
      </PageTransition>
    )
  }

  if (insights.totalApplications === 0) {
    return (
      <PageTransition>
        <h1 className="text-2xl font-semibold sm:text-3xl">Insights</h1>
        <div className="mt-6">
          <EmptyState
            icon={BarChart3}
            title="No insights yet"
            description="Once you have added and analyzed an application, this page shows where your applications stand and which skills come up most."
            action={
              <MotionButton asChild size="lg">
                <Link to="/applications/new">Add an application</Link>
              </MotionButton>
            }
          />
        </div>
      </PageTransition>
    )
  }

  const statusRows = STATUSES.map((status) => ({ name: statusLabel(status), value: insights.applicationsByStatus[status] }))
  const skillRows = insights.topMissingSkills.map((item) => ({ name: item.skill, value: item.applications }))
  const topSkill = insights.topMissingSkills[0]
  const average = insights.averageMatchScore

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold sm:text-3xl">Insights</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        <AnimatedNumber value={insights.totalApplications} />{' '}
        {insights.totalApplications === 1 ? 'application' : 'applications'},{' '}
        <AnimatedNumber value={insights.analyzedApplications} /> analyzed by the AI
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Applications by status */}
        <section className={`${card} min-w-0 lg:col-span-2`}>
          <h2 className="text-base font-semibold">Applications by status</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Where your applications are right now.</p>
          <ChartReveal direction="up" className="mt-4 h-56" data-testid="status-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusRows} margin={{ top: 20, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={0} />
                <YAxis allowDecimals={false} domain={[0, wholeNumberMax(statusRows)]} tickCount={Math.min(wholeNumberMax(statusRows), 5) + 1} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.6 }} content={<ChartTooltip unit="application" />} />
                <Bar dataKey="value" fill="var(--primary)" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="value" position="top" style={valueLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartReveal>
          <HiddenTable caption="Applications by status" rows={statusRows} valueHeader="Applications" />
        </section>

        {/* Average match score */}
        <section className={`${card} flex flex-col items-center text-center`}>
          <h2 className="self-start text-base font-semibold">Average match score</h2>
          <p className="mt-0.5 self-start text-left text-sm text-muted-foreground">
            Across your {insights.analyzedApplications} analyzed{' '}
            {insights.analyzedApplications === 1 ? 'application' : 'applications'}.
          </p>
          {average === null ? (
            <p className="my-auto py-8 text-sm text-muted-foreground">
              Nothing analyzed yet. Open an application and click "Analyze match".
            </p>
          ) : (
            <div className="my-auto flex flex-col items-center py-4">
              <ScoreRing score={Math.round(average)} />
              <p className={`mt-3 text-sm font-semibold ${scoreTone(average).text}`}>{scoreTone(average).label} on average</p>
              <p className="text-xs text-muted-foreground" data-testid="average-score">
                Exact average: {average}
              </p>
            </div>
          )}
        </section>

        {/* Skills that are missing most often */}
        <section className={`${card} min-w-0 lg:col-span-3`}>
          <h2 className="text-base font-semibold">Skills you are missing most often</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            In how many of your analyzed applications the AI listed the skill as missing.
          </p>
          {skillRows.length === 0 ? (
            <p className="mt-5 rounded-xl bg-muted/60 px-4 py-3.5 text-sm text-muted-foreground">
              {insights.analyzedApplications === 0
                ? 'Analyze an application to see which skills employers ask for that your resume does not show.'
                : 'The AI found no missing skills in your analyzed applications.'}
            </p>
          ) : (
            <>
              {topSkill && (
                <p className="mt-4 flex items-start gap-2.5 rounded-lg bg-encourage px-4 py-3 text-sm text-encourage-foreground" data-testid="skill-hint">
                  <Lightbulb className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Learning <strong>{topSkill.skill}</strong> would improve {topSkill.applications} of your{' '}
                    {insights.analyzedApplications} analyzed{' '}
                    {insights.analyzedApplications === 1 ? 'application' : 'applications'}.
                  </span>
                </p>
              )}
              <div className="mt-4">
                <SkillUniverseSection skills={insights.topMissingSkills} analyzed={insights.analyzedApplications} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Bigger and closer means missing more often. Hover or tap a skill for its number. The same numbers
                  are in the chart below.
                </p>
              </div>
              {/* 36px per skill keeps the bars thin however many skills there are */}
              <ChartReveal direction="right" className="mt-4" style={{ height: skillRows.length * 36 + 24 }} data-testid="skills-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillRows} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" allowDecimals={false} domain={[0, wholeNumberMax(skillRows)]} tickCount={Math.min(wholeNumberMax(skillRows), 5) + 1} tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={axisTick}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickFormatter={(name: string) => (name.length > 22 ? `${name.slice(0, 21)}…` : name)}
                    />
                    <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.6 }} content={<ChartTooltip unit="application" />} />
                    <Bar dataKey="value" fill="var(--primary)" maxBarSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      <LabelList dataKey="value" position="right" style={valueLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartReveal>
              <HiddenTable caption="Skills you are missing most often" rows={skillRows} valueHeader="Applications" />
            </>
          )}
        </section>
      </div>

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="size-3.5" /> Skills come from the AI analysis, so check them against the real job posting.
      </p>
    </PageTransition>
  )
}
