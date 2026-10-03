import type { StatusChange } from '../../api.ts'
import { daysSince, formatDate } from '../../lib/format.ts'
import { statusLabel } from '../../lib/status.ts'
import { StatusDot } from '../StatusBadge.tsx'

// Every status the application has had, oldest first, with the date of each change.
// The last entry is the current status and says how long it has lasted.
export default function StatusTimeline({ history }: { history: StatusChange[] }) {
  if (history.length === 0) return null
  return (
    <ol className="mt-3" data-testid="status-timeline">
      {history.map((change, index) => {
        const last = index === history.length - 1
        const days = daysSince(change.changedAt)
        return (
          <li key={`${change.changedAt}-${change.toStatus}`} className="relative flex gap-3 pb-4 last:pb-0">
            {/* The line that connects one entry with the next */}
            {!last && <span aria-hidden className="absolute left-[4.5px] top-4 h-full w-px bg-border" />}
            <span className="relative mt-1.5 flex shrink-0">
              <StatusDot status={change.toStatus} />
            </span>
            <div className="min-w-0 text-sm">
              <p className={last ? 'font-semibold' : 'font-medium'}>{change.fromStatus === null ? 'Saved' : `Moved to ${statusLabel(change.toStatus)}`}</p>
              <p className="text-xs text-muted-foreground">
                <time dateTime={change.changedAt}>{formatDate(change.changedAt)}</time>
                {last && <>. In this stage {days === 0 ? 'since today' : days === 1 ? 'for 1 day' : `for ${days} days`}</>}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
