import type { ReactNode } from 'react'

// The wrapper of a page. The fade between pages is done once, in App.tsx;
// this only keeps a common place for page-level layout classes.
export default function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}
