import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { api, errorMessage } from '../api.ts'
import type { ResumeSummary } from '../api.ts'
import Alert from '../components/Alert.tsx'
import Spinner from '../components/Spinner.tsx'
import { card, formatDate } from '../ui.ts'

export default function ResumesPage() {
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api
      .listResumes()
      .then(setResumes)
      .catch((err) => setError(errorMessage(err)))
  }, [])

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setSuccess(null)
    setUploading(true)
    try {
      const resume = await api.uploadResume(file)
      setResumes((current) => [resume, ...(current ?? [])])
      setSuccess(`"${resume.fileName}" was uploaded and its text was extracted.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
      // Clear the input so the same file can be chosen again
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">My resumes</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upload your resume as a PDF. The AI uses its text to score job matches and write cover letters.
      </p>

      <label
        className={`${card} mt-6 flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-slate-300 px-6 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40 ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          {uploading ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
          )}
        </span>
        <span className="mt-3 text-sm font-semibold text-slate-900">
          {uploading ? 'Uploading and reading your PDF…' : 'Click to upload a resume'}
        </span>
        <span className="mt-1 text-xs text-slate-500">PDF only, up to 5 MB</span>
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={upload}
          disabled={uploading}
        />
      </label>

      <div className="mt-4 space-y-3">
        {error && <Alert>{error}</Alert>}
        {success && <Alert kind="success">{success}</Alert>}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Uploaded resumes</h2>
      {resumes === null && !error ? (
        <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
          <Spinner className="h-5 w-5 text-indigo-600" /> Loading resumes…
        </div>
      ) : resumes?.length === 0 ? (
        <p className={`${card} mt-4 p-8 text-center text-sm text-slate-500`}>You have not uploaded a resume yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {resumes?.map((resume) => (
            <li key={resume.id} className={`${card} p-5`}>
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-xs font-bold text-rose-600">
                  PDF
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{resume.fileName}</p>
                  <p className="text-xs text-slate-500">Uploaded {formatDate(resume.createdAt)}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{resume.textPreview}…</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
