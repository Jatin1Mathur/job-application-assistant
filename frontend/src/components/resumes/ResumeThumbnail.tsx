import { FileText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ResumeSummary } from '../../api.ts'
import { drawFirstPage } from '../../lib/pdfThumbnail.ts'

// A small picture of the first page of a resume, so resumes can be told apart at a glance.
// Resumes without a stored PDF, and PDFs that cannot be drawn, show a plain document icon instead.
export default function ResumeThumbnail({ resume, width, className = '' }: { resume: ResumeSummary; width: number; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'none'>(resume.hasFile ? 'loading' : 'none')

  useEffect(() => {
    if (!resume.hasFile || !canvas.current) return
    let cancelled = false
    drawFirstPage(resume.id, canvas.current, width)
      .then(() => !cancelled && setState('ready'))
      .catch(() => !cancelled && setState('none'))
    return () => {
      cancelled = true
    }
  }, [resume.id, resume.hasFile, width])

  return (
    // An A4 page is 1 : 1.414. The frame has that shape from the start, so nothing jumps when the picture arrives.
    <div
      className={`relative shrink-0 overflow-hidden rounded-md border bg-white ${className}`}
      style={{ width, aspectRatio: '1 / 1.414' }}
      role="img"
      aria-label={state === 'none' ? `${resume.fileName}, no preview` : `First page of ${resume.fileName}`}
      data-testid="resume-thumbnail"
      data-state={state}
    >
      {state === 'none' ? (
        <span className="flex size-full items-center justify-center bg-muted text-muted-foreground">
          <FileText className="size-5" aria-hidden />
        </span>
      ) : (
        <>
          {state === 'loading' && <span className="absolute inset-0 animate-pulse bg-muted" aria-hidden />}
          <canvas ref={canvas} className="size-full" aria-hidden />
        </>
      )}
    </div>
  )
}
