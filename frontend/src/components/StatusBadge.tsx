import type { ApplicationStatus } from '../api.ts'
import { statusLabel } from '../lib/status.ts'

const styles: Record<ApplicationStatus, string> = {
  SAVED: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300',
  APPLIED: 'bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300',
  INTERVIEW: 'bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300',
  OFFER: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  REJECTED: 'bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300',
}

const dots: Record<ApplicationStatus, string> = {
  SAVED: 'bg-slate-400',
  APPLIED: 'bg-blue-500',
  INTERVIEW: 'bg-amber-500',
  OFFER: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
}

export function StatusDot({ status }: { status: ApplicationStatus }) {
  return <span className={`size-2 shrink-0 rounded-full ${dots[status]}`} />
}

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      <span className={`size-1.5 rounded-full ${dots[status]}`} />
      {statusLabel(status)}
    </span>
  )
}
