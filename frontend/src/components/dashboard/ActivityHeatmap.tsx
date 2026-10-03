import type { Dashboard } from '../../api.ts'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// 0, 1, 2 and "3 or more" applications on a day
const LEVELS = ['bg-muted', 'bg-primary/30', 'bg-primary/60', 'bg-primary']

const level = (count: number) => LEVELS[Math.min(count, LEVELS.length - 1)]

// Dates come as "2026-10-03". Parsed by hand, so the browser's time zone cannot shift them by a day.
function parse(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// One square per day for the last twelve weeks, darker for more applications added that day.
// One column is one week, Monday at the top. The days still to come this week are left empty.
export default function ActivityHeatmap({ days }: { days: Dashboard['days'] }) {
  const weeks: Dashboard['days'][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  const total = days.reduce((sum, day) => sum + day.applications, 0)
  const activeDays = days.filter((day) => day.applications > 0).length
  const label = (day: { date: string; applications: number }) =>
    `${parse(day.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}: ${day.applications} ${day.applications === 1 ? 'application' : 'applications'} added`

  return (
    <section className="min-w-0 rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="activity-heading" data-testid="heatmap">
      <h2 id="activity-heading" className="text-base font-semibold">
        Activity
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {total} {total === 1 ? 'application' : 'applications'} added on {activeDays} {activeDays === 1 ? 'day' : 'days'} in the last 12 weeks.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        <div className="grid grid-rows-7 gap-1 pt-5 text-[10px] leading-[14px] text-muted-foreground" aria-hidden>
          {WEEKDAYS.map((weekday, index) => (
            <span key={weekday} className={index % 2 === 0 ? '' : 'invisible'}>
              {weekday}
            </span>
          ))}
        </div>
        {/* role="img": one picture for screen readers; the sentence above and the list below carry the numbers */}
        <div className="flex gap-1" role="img" aria-label={`Calendar of the last 12 weeks. ${total} applications added on ${activeDays} days.`}>
          {weeks.map((week) => {
            const first = parse(week[0].date)
            // Name the month above the column in which it starts
            const showMonth = first.getDate() <= 7
            return (
              <div key={week[0].date} className="flex flex-col gap-1">
                <span className="h-4 text-[10px] leading-4 text-muted-foreground" aria-hidden>
                  {showMonth ? first.toLocaleDateString(undefined, { month: 'short' }) : ''}
                </span>
                {week.map((day) => (
                  <span key={day.date} title={label(day)} data-count={day.applications} className={`size-3.5 rounded-[4px] ${level(day.applications)}`} />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground" aria-hidden>
        {LEVELS.map((color, index) => (
          <span key={color} className="flex items-center gap-1">
            <span className={`size-3 rounded-[3px] ${color}`} />
            {index === LEVELS.length - 1 ? `${index}+` : index}
          </span>
        ))}
        <span>per day</span>
      </p>

      {/* The days on which something happened, as text */}
      <ul className="sr-only">
        {days
          .filter((day) => day.applications > 0)
          .map((day) => (
            <li key={day.date}>{label(day)}</li>
          ))}
      </ul>
    </section>
  )
}
