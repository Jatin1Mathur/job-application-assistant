import { ArrowRight, CalendarClock, MailQuestion, ScanSearch } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NextAction } from '../../api.ts'

function describe(action: NextAction) {
  switch (action.type) {
    case 'INTERVIEW_SOON': {
      const when = action.days === 0 ? 'today' : action.days === 1 ? 'tomorrow' : `in ${action.days} days`
      const time = new Date(action.date).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
      return { icon: CalendarClock, title: `Interview ${when}`, detail: time, tone: 'bg-encourage text-encourage-foreground' }
    }
    case 'FOLLOW_UP':
      return { icon: MailQuestion, title: `No reply for ${action.days} days`, detail: 'Consider a short follow-up', tone: 'bg-accent text-accent-foreground' }
    case 'ANALYZE':
      return { icon: ScanSearch, title: 'Not analyzed yet', detail: 'Compare it with your resume', tone: 'bg-muted text-muted-foreground' }
  }
}

// What deserves attention now, most urgent first: interviews in the next three days, applications that were
// sent more than a week ago without a reply, and applications that were never compared with a resume.
export default function NextActions({ actions }: { actions: NextAction[] }) {
  return (
    <section className="min-w-0 rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="next-actions-heading" data-testid="next-actions">
      <h2 id="next-actions-heading" className="text-base font-semibold">
        Next actions
      </h2>
      {actions.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing needs your attention right now. Interviews, missing replies and applications without an analysis will show up here.</p>
      ) : (
        <ul className="mt-3 divide-y">
          {actions.map((action) => {
            const { icon: Icon, title, detail, tone } = describe(action)
            return (
              <li key={`${action.type}-${action.applicationId}`}>
                <Link to={`/applications/${action.applicationId}`} className="group -mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60" data-action={action.type}>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block text-sm text-muted-foreground sm:truncate">
                      {action.jobTitle} at {action.companyName}. {detail}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
