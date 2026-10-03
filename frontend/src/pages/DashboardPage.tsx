import { BriefcaseBusiness, ChevronLeft, ChevronRight, Plus, SearchX } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage, STATUSES } from '../api.ts'
import type { Application, ApplicationStatus, Page } from '../api.ts'
import EmptyState from '../components/EmptyState.tsx'
import ErrorAlert from '../components/ErrorAlert.tsx'
import MotionButton from '../components/MotionButton.tsx'
import PageTransition from '../components/PageTransition.tsx'
import ScoreRing from '../components/ScoreRing.tsx'
import StatusBadge from '../components/StatusBadge.tsx'
import { Button } from '../components/ui/button.tsx'
import { Skeleton } from '../components/ui/skeleton.tsx'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs.tsx'
import { formatDate } from '../lib/format.ts'
import { staggerItem, staggerList } from '../lib/motion.ts'
import { statusLabel } from '../lib/status.ts'

const PAGE_SIZE = 9

type Filter = ApplicationStatus | 'ALL'

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
      <Link
        to={`/applications/${application.id}`}
        className="group flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs outline-none transition-shadow hover:shadow-lg hover:shadow-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-base font-semibold text-accent-foreground">
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
      </Link>
    </motion.li>
  )
}

export default function DashboardPage() {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<Page<Application> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load the list again whenever the filter or the page number changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .listApplications(filter === 'ALL' ? null : filter, page, PAGE_SIZE)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [filter, page])

  function chooseFilter(next: string) {
    setFilter(next as Filter)
    setPage(0)
  }

  const applications = result?.content ?? []

  return (
    <PageTransition>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result
              ? `${result.totalElements} ${result.totalElements === 1 ? 'application' : 'applications'}${filter === 'ALL' ? '' : ` with status ${statusLabel(filter)}`}`
              : 'Loading…'}
          </p>
        </div>
        <MotionButton asChild size="lg">
          <Link to="/applications/new">
            <Plus /> New application
          </Link>
        </MotionButton>
      </div>

      <Tabs value={filter} onValueChange={chooseFilter} className="mt-6">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            {STATUSES.map((status) => (
              <TabsTrigger key={status} value={status}>
                {statusLabel(status)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <div className="mt-6">
        {error ? (
          <ErrorAlert message={error} />
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading applications">
            {[0, 1, 2].map((item) => (
              <CardSkeleton key={item} />
            ))}
          </div>
        ) : applications.length === 0 ? (
          filter === 'ALL' ? (
            <EmptyState
              icon={BriefcaseBusiness}
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
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {applications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))}
          </motion.ul>
        )}
      </div>

      {result && result.totalPages > 1 && (
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
