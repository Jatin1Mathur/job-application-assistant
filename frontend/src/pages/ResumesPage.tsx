import { FileUp, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { toast } from 'sonner'
import { api, errorMessage } from '../api.ts'
import type { Insights, ResumeSummary } from '../api.ts'
import { DocumentStackArt } from '../components/illustrations.tsx'
import ResumeCompare from '../components/resumes/ResumeCompare.tsx'
import ResumeThumbnail from '../components/resumes/ResumeThumbnail.tsx'
import EmptyState from '../components/EmptyState.tsx'
import ErrorAlert from '../components/ErrorAlert.tsx'
import PageTransition from '../components/PageTransition.tsx'
import { Skeleton } from '../components/ui/skeleton.tsx'
import { formatDate, scoreTone } from '../lib/format.ts'
import { staggerItem, staggerList } from '../lib/motion.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  // The average match score of each resume (from the insights). Missing while loading or if nothing was analyzed.
  const [scores, setScores] = useState<Insights['scoreByResume']>([])
  // The ids of the (at most two) resumes ticked for comparison
  const [compared, setCompared] = useState<number[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  usePageTitle('Resumes')

  useEffect(() => {
    api
      .listResumes()
      .then(setResumes)
      .catch((err) => setLoadError(errorMessage(err)))
    api
      .getInsights()
      .then((insights) => setScores(insights.scoreByResume))
      .catch(() => setScores([]))
  }, [])

  // Ticking a third resume replaces the one that was ticked first
  function toggleCompare(id: number) {
    setCompared((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(-2)))
  }

  const pair = compared.map((id) => resumes?.find((resume) => resume.id === id)).filter((resume): resume is ResumeSummary => Boolean(resume))

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const resume = await api.uploadResume(file)
      setResumes((current) => [resume, ...(current ?? [])])
      toast.success('Resume uploaded', { description: `"${resume.fileName}" is ready to compare with a job.` })
    } catch (err) {
      setUploadError(errorMessage(err))
      toast.error('The upload did not work', { description: errorMessage(err) })
    } finally {
      setUploading(false)
      // Clear the input so the same file can be chosen again
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <PageTransition>
      <h1 className="text-2xl font-semibold sm:text-3xl">Resumes</h1>
      <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
        Upload your resume as a PDF. Its text is what gets compared with each job posting and what your cover
        letters are drafted from.
      </p>

      <motion.label
        whileTap={uploading ? undefined : { scale: 0.995 }}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-accent/40 ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          {uploading ? <Loader2 className="size-6 animate-spin" /> : <FileUp className="size-6" strokeWidth={1.75} />}
        </span>
        <span className="mt-3 text-sm font-semibold">
          {uploading ? 'Uploading and reading your PDF…' : 'Choose a PDF to upload'}
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

      <h2 className="mt-10 text-base font-semibold">Your resumes</h2>
      <div className="mt-3">
        {loadError ? (
          <ErrorAlert message={loadError} />
        ) : resumes === null ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading resumes">
            {[0, 1].map((item) => (
              <div key={item} className="flex gap-4 rounded-xl border bg-card p-5">
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
            art={<DocumentStackArt />}
            title="No resumes yet"
            description="Upload your resume above. It is the first step: every match score and cover letter starts from it."
          />
        ) : (
          <>
            {pair.length === 2 && (
              <div className="mb-4">
                <ResumeCompare first={pair[0]} second={pair[1]} scores={scores} onClose={() => setCompared([])} />
              </div>
            )}
            {resumes.length > 1 && pair.length < 2 && (
              <p className="mb-3 text-sm text-muted-foreground" data-testid="compare-hint">
                Tick two resumes to compare them.{compared.length === 1 ? ' One more.' : ''}
              </p>
            )}
            <motion.ul variants={staggerList} initial="hidden" animate="show" className="space-y-3">
              {resumes.map((resume) => {
                const score = scores.find((item) => item.resumeId === resume.id)
                return (
                  <motion.li key={resume.id} layout variants={staggerItem} className="flex items-start gap-4 rounded-xl border bg-card p-4 sm:p-5" data-testid={`resume-${resume.id}`}>
                    <ResumeThumbnail resume={resume} width={72} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold">{resume.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {formatDate(resume.createdAt)}
                        {score && (
                          <>
                            . Average match <span className={`font-semibold ${scoreTone(score.averageScore).text}`}>{score.averageScore}</span> from {score.analyses}{' '}
                            {score.analyses === 1 ? 'analysis' : 'analyses'}
                          </>
                        )}
                      </p>
                      {/* The skills found in the text. The first lines of a resume (name, email, phone) are never shown. */}
                      {resume.detectedSkills.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">Text read and ready to compare. No well-known skill names were found in it.</p>
                      ) : (
                        <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label={`Skills found in ${resume.fileName}`}>
                          {resume.detectedSkills.map((skill) => (
                            <li key={skill} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                              {skill}
                            </li>
                          ))}
                        </ul>
                      )}
                      {resumes.length > 1 && (
                        <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium sm:min-h-0">
                          <input type="checkbox" className="size-4 accent-(--primary)" checked={compared.includes(resume.id)} onChange={() => toggleCompare(resume.id)} />
                          Compare
                        </label>
                      )}
                    </div>
                  </motion.li>
                )
              })}
            </motion.ul>
          </>
        )}
      </div>
    </PageTransition>
  )
}
