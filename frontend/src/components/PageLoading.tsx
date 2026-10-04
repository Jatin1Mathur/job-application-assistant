import { Loader2 } from 'lucide-react'

// Shown for the short moment in which the code of a page is being downloaded
export default function PageLoading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-label="Loading the page">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
    </div>
  )
}
