import { FileText, FileUp, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { toast } from 'sonner'
import { api, errorMessage } from '../api.ts'
import type { ResumeSummary } from '../api.ts'
import EmptyState from '../components/EmptyState.tsx'
import ErrorAlert from '../components/ErrorAlert.tsx'
import PageTransition from '../components/PageTransition.tsx'
import { Skeleton } from '../components/ui/skeleton.tsx'
import { formatDate } from '../lib/format.ts'
import { staggerItem, staggerList } from '../lib/motion.ts'

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .listResumes()
      .then(setResumes)
      .catch((err) => setLoadError(errorMessage(err)))
  }, [])

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const resume = await api.uploadResume(file)
      setResumes((current) => [resume, ...(current ?? [])])
      toast.success('Resume uploaded', { description: `The text of "${resume.fileName}" was extracted.` })
    } catch (err) {
      setUploadError(errorMessage(err))
      toast.error('Upload failed', { description: errorMessage(err) })
    } finally {
      setUploading(false)
      // Clear the input so the same file can be chosen again
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold tracking-tight">My resumes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload your resume as a PDF. The AI uses its text to score job matches and write cover letters.
      </p>

      <motion.label
        whileHover={uploading ? undefined : { scale: 1.005 }}
        whileTap={uploading ? undefined : { scale: 0.995 }}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-accent/40 ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          {uploading ? <Loader2 className="size-6 animate-spin" /> : <FileUp className="size-6" strokeWidth={1.75} />}
        </span>
        <span className="mt-3 text-sm font-semibold">
          {uploading ? 'Uploading and reading your PDF…' : 'Click to upload a resume'}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">PDF only, up to 5 MB</span>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={upload}
          disabled={uploading}
        />
      </motion.label>

      {uploadError && (
        <div className="mt-4">
          <ErrorAlert message={uploadError} />
        </div>
      )}

      <h2 className="mt-9 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploaded resumes</h2>
      <div className="mt-3">
        {loadError ? (
          <ErrorAlert message={loadError} />
        ) : resumes === null ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading resumes">
            {[0, 1].map((item) => (
              <div key={item} className="flex gap-4 rounded-2xl border bg-card p-5">
                <Skeleton className="size-11 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-2 h-3 w-28" />
                  <Skeleton className="mt-3 h-3.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No resumes yet"
            description="Upload your first resume above. You need one before the AI can analyze a job or write a cover letter."
          />
        ) : (
          <motion.ul variants={staggerList} initial="hidden" animate="show" className="space-y-3">
            {resumes.map((resume) => (
              <motion.li
                key={resume.id}
                layout
                variants={staggerItem}
                className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-xs"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{resume.fileName}</p>
                  <p className="text-xs text-muted-foreground">Uploaded {formatDate(resume.createdAt)}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{resume.textPreview}…</p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </PageTransition>
  )
}
