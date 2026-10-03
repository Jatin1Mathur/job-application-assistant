import { ChevronLeft, ChevronRight, Columns3, LayoutGrid, Plus, SearchX } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api, errorMessage, STATUSES } from '../api.ts'
import type { Application, ApplicationStatus, Page } from '../api.ts'
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
import { Button } from '../components/ui/button.tsx'
import { Skeleton } from '../components/ui/skeleton.tsx'
import { Tabs } from '../components/ui/tabs.tsx'
import { celebrateOffer } from '../lib/celebrate.ts'
import { formatDate } from '../lib/format.ts'
import { staggerItem, staggerList } from '../lib/motion.ts'
import { statusLabel } from '../lib/status.ts'

const PAGE_SIZE = 9
// The board shows every application at once (the backend allows at most 100 per request)
const BOARD_SIZE = 100
const VIEW_KEY = 'job-assistant.view'

type Filter = ApplicationStatus | 'ALL'
type View = 'list' | 'board'

function CardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="size-11 rounded-xl" />
        <Skeleton className="size-12 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3.5 w-1/2" />
      <Skeleton className="mt-5 h-6 w-24 rounded-full" />
    </div>
  )
}

function ApplicationCard({ application }: { application: Application }) {
  return (
    // variants: the card takes part in the list's stagger. whileHover: it lifts a little under the mouse
    <motion.li variants={staggerItem} whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
      {/* state: hands the application to the detail page, so its header can be drawn immediately */}
      <Link to={`/applications/${application.id}`} state={{ application }} className="group block h-full rounded-2xl">
        {/* layoutId: the detail page's header has the same one, so this card grows into it */}
        <motion.div
          layoutId={`application-${application.id}`}
          transition={{ type: 'spring', duration: 0.38, bounce: 0.12 }}
          className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-card transition-shadow group-hover:shadow-raised"
        >
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent font-display text-base font-semibold text-accent-foreground">
            {application.companyName.charAt(0).toUpperCase()}
          </span>
          {application.matchScore === null ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Not analyzed
            </span>
          ) : (
            <ScoreRing score={application.matchScore} size="sm" />
          )}
        </div>
        <h2 className="mt-4 line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary">
          {application.jobTitle}
        </h2>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{application.companyName}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-5">
          <StatusBadge status={application.status} />
          <span className="text-xs text-muted-foreground">{formatDate(application.createdAt)}</span>
        </div>
        </motion.div>
      </Link>
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
      .then(([resumes, insights, firstPage]) =>
        setOnboarding({
          hasResume: resumes.length > 0,
          hasApplication: insights.totalApplications > 0,
          hasAnalysis: insights.analyzedApplications > 0,
          firstApplicationId: firstPage.content[0]?.id ?? null,
        }),
      )
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
            content: current.content.map((item) => (item.id === application.id ? { ...item, status: next } : item)),
          },
      )
    const previous = application.status
    setStatus(status)
    try {
      await api.updateStatus(application.id, status)
      toast.success(`${application.companyName} moved to ${statusLabel(status)}`)
      if (status === 'OFFER') celebrateOffer()
    } catch (err) {
      setStatus(previous)
      toast.error('Could not move the application', {
        description: `${errorMessage(err)} It is back in ${statusLabel(previous)}.`,
      })
    }
  }, [])

  const applications = result?.content ?? []
  const onboardingOpen =
    onboarding !== null && !(onboarding.hasResume && onboarding.hasApplication && onboarding.hasAnalysis)
  const nothingYet = !loading && !error && filter === 'ALL' && applications.length === 0

  return (
    <PageTransition>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My applications</h1>
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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
                  ...STATUSES.map((status) => ({ value: status, label: statusLabel(status) })),
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
          <p className="rounded-2xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
            No applications yet. Your applications will appear here.
          </p>
        ) : isBoard ? (
          <KanbanBoard applications={applications} onMove={moveApplication} />
        ) : applications.length === 0 ? (
          filter === 'ALL' ? (
            <EmptyState
              icon={Plus}
              title="No applications yet"
              description="Create your first one: paste a job posting and let the AI compare it with your resume."
              action={
                <MotionButton asChild size="lg">
                  <Link to="/applications/new">
                    <Plus /> Create your first application
                  </Link>
                </MotionButton>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title={`No applications with status ${statusLabel(filter)}`}
              description="Try another filter, or change the status of an application on its page."
            />
          )
        ) : (
          // The key makes the list animate again after a new filter or page
          <motion.ul
            key={`${filter}-${page}`}
            variants={staggerList}
            initial="hidden"
            animate="show"
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
