import { ArrowUpRight } from 'lucide-react'

const GITHUB_URL = 'https://github.com/Jatin1Mathur'
const LINKEDIN_URL = 'https://www.linkedin.com/in/jatin-mathur-b04b122b'

const link = 'inline-flex min-h-11 items-center gap-1 rounded text-base font-medium text-foreground underline decoration-primary/40 decoration-2 underline-offset-4 hover:decoration-primary'

// Who made this: a real person a visitor can look up
export default function BuiltBy() {
  return (
    <aside className="rounded-2xl border bg-card p-6 sm:p-7" aria-labelledby="built-by-heading">
      <p id="built-by-heading" className="text-sm font-medium text-muted-foreground">
        Built by
      </p>
      <div className="mt-3 flex items-center gap-4">
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary font-display text-xl font-semibold text-primary-foreground">
          JM
        </span>
        <div>
          <p className="text-xl font-semibold">Jatin Mathur</p>
          <p className="text-muted-foreground">M.Sc. Software Engineering student</p>
        </div>
      </div>
      <p className="mt-4 leading-relaxed text-muted-foreground">Job Assistant is my master's project. The code is on GitHub.</p>
      <p className="mt-3 flex flex-wrap gap-x-6">
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={link}>
          GitHub <ArrowUpRight className="size-4" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className={link}>
          LinkedIn <ArrowUpRight className="size-4" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </p>
    </aside>
  )
}
