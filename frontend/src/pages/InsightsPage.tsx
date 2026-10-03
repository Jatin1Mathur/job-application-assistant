import { Lightbulb, Sparkles, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, errorMessage, STATUSES } from '../api.ts'
import type { Insights } from '../api.ts'
import AnimatedNumber from '../components/AnimatedNumber.tsx'
import ChartReveal from '../components/ChartReveal.tsx'
import EmptyState from '../components/EmptyState.tsx'
import { TelescopeArt } from '../components/illustrations.tsx'
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

// "2026-09-14" -> "14 Sep". Parsed by hand, so the browser's time zone cannot shift the day.
function weekLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

const FUNNEL_TEXT: Record<string, { name: string; of: string }> = {
  SAVED: { name: 'Saved', of: '' },
  APPLIED: { name: 'Sent', of: 'of saved were sent' },
  INTERVIEW: { name: 'Interview', of: 'of sent led to an interview' },
  OFFER: { name: 'Offer', of: 'of interviews led to an offer' },
}

// From saved to offer: how many applications ever reached each stage, and what share of the stage before that is.
// Each bar is as wide as its share of all applications and grows in when it scrolls into view.
function Funnel({ stages }: { stages: Insights['funnel'] }) {
  const most = Math.max(1, ...stages.map((stage) => stage.applications))
  return (
    <ol className="mt-5 space-y-3" data-testid="funnel">
      {stages.map((stage, index) => {
        const text = FUNNEL_TEXT[stage.stage]
        return (
          <li key={stage.stage} className="grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-0.5 sm:grid-cols-[6.5rem_1fr]" data-stage={stage.stage}>
            <span className="text-sm font-medium">{text.name}</span>
            <div className="flex items-center gap-2.5">
              <motion.span
                className="block h-7 min-w-1 rounded-md bg-primary"
                style={{ width: `${(stage.applications / most) * 100}%`, transformOrigin: 'left', opacity: 1 - index * 0.16 }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
              <span className="text-sm font-semibold tabular-nums">{stage.applications}</span>
            </div>
            {stage.rateFromPrevious !== null && (
              <span className="col-start-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{Math.round(stage.rateFromPrevious)}%</span> {text.of}
              </span>
            )}
          </li>
        )
      })}
    </ol>
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
            art={<TelescopeArt />}
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
  const weekRows = insights.scoreByWeek.map((week) => ({ name: `Week of ${weekLabel(week.weekStart)}`, tick: weekLabel(week.weekStart), value: week.averageScore, analyses: week.analyses }))
  const categoryRows = insights.skillCategories.map((category) => ({ ...category, name: category.category, value: category.matchRate }))
  const bestResume = insights.scoreByResume[0]
  const otherResumes = insights.scoreByResume.slice(1)

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

        {/* From saved to offer */}
        <section className={`${card} min-w-0 lg:col-span-2`} aria-labelledby="funnel-heading">
          <h2 id="funnel-heading" className="text-base font-semibold">
            From saved to offer
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">How many applications ever reached each stage, also if they were rejected later.</p>
          <Funnel stages={insights.funnel} />
        </section>

        {/* Best resume */}
        <section className={`${card} min-w-0`} aria-labelledby="resume-heading" data-testid="best-resume">
          <h2 id="resume-heading" className="text-base font-semibold">
            Best resume
          </h2>
          {!bestResume ? (
            <p className="mt-3 text-sm text-muted-foreground">Analyze an application to see which resume scores best.</p>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.35 }}>
              <p className="mt-0.5 text-sm text-muted-foreground">The resume with the highest average match score.</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-encourage text-encourage-foreground">
                  <Trophy className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" title={bestResume.fileName}>
                    {bestResume.fileName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className={`font-semibold tabular-nums ${scoreTone(bestResume.averageScore).text}`}>{bestResume.averageScore}</span> on average, from{' '}
                    {bestResume.analyses} {bestResume.analyses === 1 ? 'analysis' : 'analyses'}
                  </p>
                </div>
              </div>
              {otherResumes.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">Only this resume has been used for an analysis so far, so there is nothing to compare it with.</p>
              ) : (
                <ul className="mt-4 space-y-1.5 border-t pt-3 text-sm">
                  {otherResumes.map((resume) => (
                    <li key={resume.resumeId} className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-muted-foreground" title={resume.fileName}>
                        {resume.fileName}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {resume.averageScore} <span className="text-xs text-muted-foreground">({resume.analyses})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {bestResume.analyses < 3 && <p className="mt-3 text-xs text-muted-foreground">Based on few analyses. The jobs differ too, so read this as a hint.</p>}
            </motion.div>
          )}
        </section>

        {/* Score over time */}
        <section className={`${card} min-w-0 lg:col-span-2`} aria-labelledby="trend-heading">
          <h2 id="trend-heading" className="text-base font-semibold">
            Match score over time
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">The average score of the analyses made in each week. Weeks without an analysis are left out.</p>
          {weekRows.length === 0 ? (
            <p className="mt-5 rounded-xl bg-muted/60 px-4 py-3.5 text-sm text-muted-foreground">Nothing analyzed yet.</p>
          ) : (
            <>
              <ChartReveal direction="up" className="mt-4 h-56" data-testid="trend-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekRows} margin={{ top: 20, right: 16, bottom: 0, left: -20 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="tick" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} padding={{ left: 16, right: 16 }} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axisTick} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ stroke: 'var(--border)' }} content={<ChartTooltip unit="point" />} />
                    {/* Straight lines between the weeks: a curve would suggest values that were never measured */}
                    <Line type="linear" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false}>
                      <LabelList dataKey="value" position="top" offset={10} style={valueLabel} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </ChartReveal>
              {weekRows.length === 1 && <p className="mt-2 text-xs text-muted-foreground">One week of data so far. A line appears once a second week has an analysis.</p>}
              <HiddenTable caption="Average match score per week" rows={weekRows} valueHeader="Average score" />
            </>
          )}
        </section>

        {/* Skills by category */}
        <section className={`${card} min-w-0`} aria-labelledby="radar-heading">
          <h2 id="radar-heading" className="text-base font-semibold">
            Skills by category
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Of the skills the jobs asked for in each category: how many percent your resume showed.</p>
          {categoryRows.length === 0 ? (
            <p className="mt-5 rounded-xl bg-muted/60 px-4 py-3.5 text-sm text-muted-foreground">Nothing analyzed yet.</p>
          ) : (
            <>
              {/* A radar needs at least three corners. With fewer categories the list below is the whole picture. */}
              {categoryRows.length >= 3 && (
                <ChartReveal direction="in" className="mt-2 h-56" data-testid="radar-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={categoryRows} outerRadius="62%">
                      <PolarGrid stroke="var(--border)" />
                      {/* Only the first word around the chart ("Cloud", "Tools"), so no label is cut off. The full names are in the list below. */}
                      <PolarAngleAxis dataKey="name" tick={{ ...axisTick, fontSize: 11 }} tickFormatter={(name: string) => name.split(' ')[0]} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="var(--primary)" fillOpacity={0.22} isAnimationActive={false} />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartReveal>
              )}
              <ul className="mt-3 space-y-1 text-sm" data-testid="category-list">
                {categoryRows.map((category) => (
                  <li key={category.name} className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-muted-foreground">{category.name}</span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-semibold">{Math.round(category.matchRate)}%</span>{' '}
                      <span className="text-xs text-muted-foreground">
                        ({category.matching} of {category.matching + category.missing})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
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
