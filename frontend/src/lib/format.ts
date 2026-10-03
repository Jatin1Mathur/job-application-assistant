export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Red for a weak match, yellow for a medium one, green for a strong one
export function scoreTone(score: number) {
  if (score >= 75) {
    return { label: 'Strong match', text: 'text-emerald-700 dark:text-emerald-400', stroke: 'stroke-emerald-500' }
  }
  if (score >= 50) {
    return { label: 'Partial match', text: 'text-amber-700 dark:text-amber-400', stroke: 'stroke-amber-500' }
  }
  return { label: 'Weak match', text: 'text-rose-700 dark:text-rose-400', stroke: 'stroke-rose-500' }
}

// Whole calendar days from that moment until today (0 = today)
export function daysSince(iso: string): number {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return Math.max(0, Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000))
}

// "today", "yesterday", "5 days ago", and a normal date once it is more than two weeks ago.
// For a job hunt, how long ago something happened matters more than the exact day.
export function formatRelativeDate(iso: string): string {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days <= 14) return `${days} days ago`
  return `on ${formatDate(iso)}`
}
