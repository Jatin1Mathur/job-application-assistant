// Tailwind class names shared by several pages, so buttons and inputs look the same everywhere

export const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm'

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

export const buttonPrimary = `${buttonBase} bg-indigo-600 text-white shadow-sm hover:bg-indigo-500`

export const buttonSecondary = `${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`

export const input =
  'block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm ' +
  'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'

export const label = 'mb-1.5 block text-sm font-medium text-slate-700'

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Green for a strong match, amber for a medium one, red for a weak one
export function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-rose-600'
}
