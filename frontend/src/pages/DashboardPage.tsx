import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage, STATUSES } from '../api.ts'
import type { Application, ApplicationStatus, Page } from '../api.ts'
import Alert from '../components/Alert.tsx'
import Spinner from '../components/Spinner.tsx'
import StatusBadge, { statusLabel } from '../components/StatusBadge.tsx'
import { buttonPrimary, buttonSecondary, card, formatDate, scoreColor } from '../ui.ts'

const PAGE_SIZE = 10

export default function DashboardPage() {
  const [status, setStatus] = useState<ApplicationStatus | null>(null)
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
      .listApplications(status, page, PAGE_SIZE)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [status, page])

  function chooseStatus(next: ApplicationStatus | null) {
    setStatus(next)
    setPage(0)
  }

  const applications = result?.content ?? []

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My applications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {result ? `${result.totalElements} ${result.totalElements === 1 ? 'application' : 'applications'}` : ' '}
            {status && result ? ` with status ${statusLabel(status)}` : ''}
          </p>
        </div>
        <Link to="/applications/new" className={buttonPrimary}>
          <span className="text-lg leading-none">+</span> New application
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[null, ...STATUSES].map((option) => (
          <button
            key={option ?? 'ALL'}
            type="button"
            onClick={() => chooseStatus(option)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              status === option
                ? 'bg-slate-900 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {option ? statusLabel(option) : 'All'}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className={`${card} mt-6 overflow-hidden`}>
        {loading && !result ? (
          <div className="flex items-center justify-center gap-3 p-16 text-sm text-slate-500">
            <Spinner className="h-5 w-5 text-indigo-600" /> Loading applications…
          </div>
        ) : applications.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-base font-semibold text-slate-900">
              {status ? `No applications with status ${statusLabel(status)}` : 'No applications yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {status ? 'Try another filter.' : 'Add the first job you want to apply for.'}
            </p>
            {!status && (
              <Link to="/applications/new" className={`${buttonPrimary} mt-5`}>
                Create application
              </Link>
            )}
          </div>
        ) : (
          <ul className={`divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
            {applications.map((application) => (
              <li key={application.id}>
                <Link
                  to={`/applications/${application.id}`}
                  className="flex items-center gap-3 px-4 py-4 transition hover:bg-slate-50 sm:gap-4 sm:px-6"
                >
                  <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-base font-bold text-indigo-600 sm:flex">
                    {application.companyName.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{application.jobTitle}</span>
                    <span className="block truncate text-sm text-slate-500">
                      {application.companyName} · added {formatDate(application.createdAt)}
                    </span>
                  </span>
                  <StatusBadge status={application.status} />
                  <span className="w-16 shrink-0 text-right sm:w-20">
                    {application.matchScore === null ? (
                      <span className="text-xs text-slate-400">Not analyzed</span>
                    ) : (
                      <>
                        <span className={`text-lg font-bold ${scoreColor(application.matchScore)}`}>
                          {application.matchScore}
                        </span>
                        <span className="text-xs text-slate-400"> / 100</span>
                      </>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result && result.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {result.page + 1} of {result.totalPages}
          </span>
          <div className="flex gap-2">
            <button type="button" className={buttonSecondary} disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button
              type="button"
              className={buttonSecondary}
              disabled={page + 1 >= result.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
