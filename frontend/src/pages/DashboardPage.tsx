import { ChevronLeft, ChevronRight, Columns3, LayoutGrid, Plus, SearchX } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api, errorMessage, STATUSES } from '../api.ts'
import type { Application, ApplicationStatus, Dashboard, Page } from '../api.ts'
import { useAuth } from '../auth.tsx'
import ActivityHeatmap from '../components/dashboard/ActivityHeatmap.tsx'
import NextActions from '../components/dashboard/NextActions.tsx'
import StatCards from '../components/dashboard/StatCards.tsx'
import { PaperPlaneArt } from '../components/illustrations.tsx'
import { Input } from '../components/ui/input.tsx'
import AnimatedNumber from '../components/AnimatedNumber.tsx'
import AnimatedTabsList from '../components/AnimatedTabsList.tsx'
import EmptyState from '../components/EmptyState.tsx'
import ErrorAlert from '../components/ErrorAlert.tsx'
import KanbanBoard from '../components/KanbanBoard.tsx'
import MotionButton from '../components/MotionButton.tsx'
import OnboardingChecklist from '../components/OnboardingChecklist.tsx'
import type { OnboardingState } from '../components/OnboardingChecklist.tsx'
import PageTransition from '../components/PageTransition.tsx'
import ScoreRing from '../components/ScoreRing.tsx'
import StatusBadge from '../components/StatusBadge.tsx'
import TiltCard from '../components/TiltCard.tsx'
import { Button } from '../components/ui/button.tsx'
import { Skeleton } from '../components/ui/skeleton.tsx'
import { Tabs } from '../components/ui/tabs.tsx'
import { celebrateOffer } from '../lib/celebrate.ts'
import { formatRelativeDate } from '../lib/format.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { staggerItem, staggerList } from '../lib/motion.ts'
import { statusLabel } from '../lib/status.ts'

const PAGE_SIZE = 9
// The board shows every application at once (the backend allows at most 100 per request)
const BOARD_SIZE = 100
const VIEW_KEY = 'job-assistant.view'

type Filter = ApplicationStatus | 'ALL'
type View = 'list' | 'board'

// "Good morning", "Good afternoon" or "Good evening", from the clock of the device
function greeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// The greeting has the user's name in it. Someone who has not given a name can add it right here.
function AddName({ onSaved }: { onSaved: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const account = await api.updateName(name)
      if (account.name) onSaved(account.name)
    } catch (err) {
      toast.error('The name was not saved', { description: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded text-sm font-medium text-foreground underline decoration-primary/40 decoration-2 underline-offset-4 hover:decoration-primary">
        Add your name
      </button>
    )
  }
  return (
    <form onSubmit={save} className="flex items-center gap-2">
      <label htmlFor="greeting-name" className="sr-only">
        Your first name
      </label>
      <Input id="greeting-name" autoFocus autoComplete="given-name" maxLength={100} placeholder="Your first name" value={name} onChange={(event) => setName(event.target.value)} className="h-9 w-44" />
      <Button type="submit" size="lg" disabled={saving || !name.trim()}>
        Save
      </Button>
    </form>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex h-12 items-center justify-between">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="size-12 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3.5 w-1/2" />
      <Skeleton className="mt-6 h-3 w-20" />
    </div>
  )
}

function ApplicationCard({ application }: { application: Application }) {
  return (
    // variants: the card takes part in the list's stagger
    <motion.li variants={staggerItem}>
      <TiltCard className="h-full">
        {/* state: hands the application to the detail page, so its header can be drawn immediately */}
        <Link to={`/applications/${application.id}`} state={{ application }} className="group block h-full rounded-xl">
          {/* layoutId: the detail page's header has the same one, so this card grows into it */}
          <motion.div
            layoutId={`application-${application.id}`}
            transition={{ type: 'spring', duration: 0.38, bounce: 0.12 }}
            className="flex h-full flex-col rounded-xl border bg-card p-5 transition-shadow group-hover:shadow-raised"
          >
            {/* A fixed-height top row, so the titles of all cards start on the same line */}
            <div className="flex h-12 items-center justify-between gap-3">
              <StatusBadge status={application.status} />
              {application.matchScore === null ? (
                <span className="text-xs text-muted-foreground">Not analyzed yet</span>
              ) : (
                <ScoreRing score={application.matchScore} size="sm" />
              )}
            </div>
            <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-snug">{application.jobTitle}</h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{application.companyName}</p>
            <p className="mt-auto pt-5 text-xs text-muted-foreground">Added {formatRelativeDate(application.createdAt)}</p>
          </motion.div>
        </Link>
      </TiltCard>
    </motion.li>
  )
}

export default function DashboardPage() {
  const [view, setView] = useState<View>(() => (localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'list'))
  const [filter, setFilter] = useState<Filter>('ALL')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<Page<Application> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null)
  // How many applications each status has, shown inside the filter tabs
  const [counts, setCounts] = useState<Record<ApplicationStatus, number> | null>(null)
  // The numbers above the list: stat cards, next actions, activity
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const { isDemo } = useAuth()

  const loadDashboard = useCallback(() => {
    api
      .getDashboard()
      .then(setDashboard)
      .catch(() => setDashboard(null))
  }, [])

  useEffect(loadDashboard, [loadDashboard])
  usePageTitle('Applications')

  const isBoard = view === 'board'

  // Load the applications again whenever the view, the filter or the page number changes.
  // The board ignores the filter and paging: it shows everything, grouped by status.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const request = isBoard
      ? api.listApplications(null, 0, BOARD_SIZE)
      : api.listApplications(filter === 'ALL' ? null : filter, page, PAGE_SIZE)
    request
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [isBoard, filter, page])

  // What the onboarding checklist needs to know. It is only shown while a step is still open.
  useEffect(() => {
    Promise.all([api.listResumes(), api.getInsights(), api.listApplications(null, 0, 1)])
      .then(([resumes, insights, firstPage]) => {
        setCounts(insights.applicationsByStatus)
        setOnboarding({
          hasResume: resumes.length > 0,
          hasApplication: insights.totalApplications > 0,
          hasAnalysis: insights.analyzedApplications > 0,
          firstApplicationId: firstPage.content[0]?.id ?? null,
        })
      })
      .catch(() => setOnboarding(null))
  }, [])

  function chooseView(next: string) {
    localStorage.setItem(VIEW_KEY, next)
    setView(next as View)
    setPage(0)
    setResult(null)
  }

  function chooseFilter(next: string) {
    setFilter(next as Filter)
    setPage(0)
  }

  // Dragging a card to another column. The board changes at once ("optimistic update"), without waiting
  // for the backend. If the backend then says no, the card is put back and the error is shown.
  const moveApplication = useCallback(async (application: Application, status: ApplicationStatus) => {
    const setStatus = (next: ApplicationStatus) =>
      setResult(
        (current) =>
          current && {
            ...current,
            // A new status also starts "days in this stage" again
            content: current.content.map((item) =>
              item.id === application.id ? { ...item, status: next, statusChangedAt: next === previous ? application.statusChangedAt : new Date().toISOString() } : item,
            ),
          },
      )
    const previous = application.status
    const moveCount = (from: ApplicationStatus, to: ApplicationStatus) =>
      setCounts((current) => current && { ...current, [from]: current[from] - 1, [to]: current[to] + 1 })
    setStatus(status)
    moveCount(previous, status)
    try {
      await api.updateStatus(application.id, status)
      toast.success(`${application.companyName} moved to ${statusLabel(status)}`)
      if (status === 'OFFER') celebrateOffer()
      // The counts, the interview rate and the next actions may all have changed
      loadDashboard()
    } catch (err) {
      setStatus(previous)
      moveCount(status, previous)
      toast.error('Could not move the application', {
        description: `${errorMessage(err)} It is back in ${statusLabel(previous)}.`,
      })
    }
  }, [loadDashboard])

  const applications = result?.content ?? []
  const onboardingOpen =
    onboarding !== null && !(onboarding.hasResume && onboarding.hasApplication && onboarding.hasAnalysis)
  const nothingYet = !loading && !error && filter === 'ALL' && applications.length === 0

  return (
    <PageTransition>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl" data-testid="greeting">
            {greeting()}
            {dashboard?.name ? `, ${dashboard.name}` : ''}
          </h1>
          {dashboard && !dashboard.name && !isDemo && (
            <div className="mt-1.5">
              <AddName onSaved={(name) => setDashboard((current) => current && { ...current, name })} />
            </div>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {result ? (
              <>
                <AnimatedNumber value={result.totalElements} />{' '}
                {result.totalElements === 1 ? 'application' : 'applications'}
                {!isBoard && filter !== 'ALL' ? ` with status ${statusLabel(filter)}` : ''}
              </>
            ) : (
              'Loading…'
            )}
          </p>
        </div>
        <MotionButton asChild size="lg">
          <Link to="/applications/new">
            <Plus /> New application
          </Link>
        </MotionButton>
      </div>

      {onboardingOpen && (
        <div className="mt-6">
          <OnboardingChecklist state={onboarding} />
        </div>
      )}

      {/* The overview is for someone who has applications. A new account sees the checklist instead of four zeros. */}
      {dashboard && dashboard.totalApplications > 0 && (
        <>
          <div className="mt-6">
            <StatCards dashboard={dashboard} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <NextActions actions={dashboard.nextActions} />
            <ActivityHeatmap days={dashboard.days} />
          </div>
        </>
      )}

      <h2 className="mt-10 text-xl font-semibold">My applications</h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {/* List or board */}
        <Tabs value={view} onValueChange={chooseView}>
          <AnimatedTabsList
            id="view"
            label="View"
            value={view}
            options={[
              { value: 'list', label: 'List', icon: LayoutGrid },
              { value: 'board', label: 'Board', icon: Columns3 },
            ]}
          />
        </Tabs>
        {!isBoard && (
          <Tabs value={filter} onValueChange={chooseFilter} className="min-w-0">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <AnimatedTabsList
                id="status"
                label="Status filter"
                value={filter}
                options={[
                  { value: 'ALL', label: 'All' },
                  ...STATUSES.map((status) => ({ value: status, label: statusLabel(status), count: counts?.[status] })),
                ]}
              />
            </div>
          </Tabs>
        )}
        {isBoard && (
          <p className="text-xs text-muted-foreground">Drag a card by its handle to change the status.</p>
        )}
      </div>

      <div className="mt-5">
        {error ? (
          <ErrorAlert message={error} />
        ) : loading && !result ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading applications">
            {[0, 1, 2].map((item) => (
              <CardSkeleton key={item} />
            ))}
          </div>
        ) : nothingYet && onboardingOpen ? (
          // The checklist above already says what to do first, so no second empty message here
          <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
            <PaperPlaneArt />
            <p className="mt-2">No applications yet. They will appear here once you add the first one.</p>
          </div>
        ) : isBoard ? (
          <KanbanBoard applications={applications} onMove={moveApplication} />
        ) : applications.length === 0 ? (
          filter === 'ALL' ? (
            <EmptyState
              art={<PaperPlaneArt />}
              title="No applications yet"
              description="Add the first job you are interested in. Paste the posting and you will see how well your resume fits it."
              action={
                <MotionButton asChild size="lg">
                  <Link to="/applications/new">
                    <Plus /> Add your first application
                  </Link>
                </MotionButton>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title={`No applications with status ${statusLabel(filter)}`}
              description="Nothing is at this stage right now. Choose another status, or move an application here from its page."
            />
          )
        ) : (
          // The key makes the list animate again after a new filter or page
          <motion.ul
            key={`${filter}-${page}`}
            variants={staggerList}
            initial="hidden"
            animate="show"
            data-testid="application-list"
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}
          >
            {applications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </motion.ul>
        )}
      </div>

      {isBoard && result && result.totalElements > BOARD_SIZE && (
        <p className="mt-3 text-xs text-muted-foreground">
          The board shows your {BOARD_SIZE} newest applications. Use the list view to see all {result.totalElements}.
        </p>
      )}

      {!isBoard && result && result.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {result.page + 1} of {result.totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="lg" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft /> Previous
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={page + 1 >= result.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </PageTransition>
  )
}
