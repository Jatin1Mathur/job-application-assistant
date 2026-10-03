import type { ApplicationStatus } from '../api.ts'

const styles: Record<ApplicationStatus, string> = {
  SAVED: 'bg-slate-100 text-slate-700 ring-slate-200',
  APPLIED: 'bg-blue-50 text-blue-700 ring-blue-200',
  INTERVIEW: 'bg-amber-50 text-amber-700 ring-amber-200',
  OFFER: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
}

const dots: Record<ApplicationStatus, string> = {
  SAVED: 'bg-slate-400',
  APPLIED: 'bg-blue-500',
  INTERVIEW: 'bg-amber-500',
  OFFER: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
}

export function statusLabel(status: ApplicationStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {statusLabel(status)}
    </span>
  )
}
