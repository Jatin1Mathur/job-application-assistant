import type { ReactNode } from 'react'

// A key cap, e.g. ⌘ or K
export default function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  )
}
