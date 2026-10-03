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
