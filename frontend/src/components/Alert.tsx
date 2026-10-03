import type { ReactNode } from 'react'

const styles = {
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-indigo-200 bg-indigo-50 text-indigo-800',
}

// A colored box for error, success and info messages
export default function Alert({ kind = 'error', children }: { kind?: keyof typeof styles; children: ReactNode }) {
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${styles[kind]}`}>
      {children}
    </div>
  )
}
