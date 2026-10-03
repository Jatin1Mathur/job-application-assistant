import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, errorMessage, STATUSES } from '../api.ts'
import type { Application, ApplicationStatus, MatchAnalysis, ResumeSummary } from '../api.ts'
import Alert from '../components/Alert.tsx'
import Spinner from '../components/Spinner.tsx'
import StatusBadge, { statusLabel } from '../components/StatusBadge.tsx'
import { buttonPrimary, buttonSecondary, card, formatDate, input, scoreColor } from '../ui.ts'

// Counts the seconds while a slow AI request is running, so the user sees that something is happening
function useElapsedSeconds(running: boolean): number {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) return
    setSeconds(0)
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [running])
  return seconds
}

// The backend only stores the score. The skills and tips of the last analysis are remembered in the browser
const analysisKey = (applicationId: number) => `job-assistant.analysis.${applicationId}`

function loadSavedAnalysis(applicationId: number): MatchAnalysis | null {
  try {
    const saved = localStorage.getItem(analysisKey(applicationId))
    return saved ? (JSON.parse(saved) as MatchAnalysis) : null
  } catch {
    return null
  }
}

function SkillTags({ title, skills, color, empty }: { title: string; skills: string[]; color: string; empty: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">
        {title} <span className="font-normal text-slate-400">({skills.length})</span>
      </h3>
      {skills.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li key={skill} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${color}`}>
              {skill}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ApplicationDetailPage() {
  const id = Number(useParams().id)
  const [application, setApplication] = useState<Application | null>(null)
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null)
  const [analysisFromCache, setAnalysisFromCache] = useState<boolean | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [writing, setWriting] = useState(false)
  const [letterError, setLetterError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const analyzeSeconds = useElapsedSeconds(analyzing)
  const writingSeconds = useElapsedSeconds(writing)

  useEffect(() => {
    setApplication(null)
    setLoadError(null)
    setAnalysis(loadSavedAnalysis(id))
    setAnalysisFromCache(null)
    Promise.all([api.getApplication(id), api.listResumes()])
      .then(([loadedApplication, loadedResumes]) => {
        setApplication(loadedApplication)
        setResumes(loadedResumes)
        setResumeId(loadedResumes[0]?.id ?? null)
      })
      .catch((err) => setLoadError(errorMessage(err)))
  }, [id])

  async function analyze() {
    if (resumeId === null) return
    setAnalyzeError(null)
    setAnalyzing(true)
    try {
      const result = await api.analyze(id, resumeId)
      setAnalysis(result.analysis)
      setAnalysisFromCache(result.cached)
      localStorage.setItem(analysisKey(id), JSON.stringify(result.analysis))
      setApplication((current) => current && { ...current, matchScore: result.analysis.matchScore })
    } catch (err) {
      setAnalyzeError(errorMessage(err))
    } finally {
      setAnalyzing(false)
    }
  }

  async function writeCoverLetter() {
    if (resumeId === null) return
    setLetterError(null)
    setWriting(true)
    try {
      const result = await api.generateCoverLetter(id, resumeId)
      setApplication((current) => current && { ...current, coverLetter: result.coverLetter })
    } catch (err) {
      setLetterError(errorMessage(err))
    } finally {
      setWriting(false)
    }
  }

  async function copyCoverLetter() {
    if (!application?.coverLetter) return
    try {
      await navigator.clipboard.writeText(application.coverLetter)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setLetterError('Could not copy to the clipboard. Select the text and copy it by hand.')
    }
  }

  async function changeStatus(status: ApplicationStatus) {
    setStatusError(null)
    setStatusSaving(true)
    try {
      setApplication(await api.updateStatus(id, status))
    } catch (err) {
      setStatusError(errorMessage(err))
    } finally {
      setStatusSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Alert>{loadError}</Alert>
        <Link to="/" className={buttonSecondary}>
          ← Back to applications
        </Link>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="flex items-center justify-center gap-3 p-16 text-sm text-slate-500">
        <Spinner className="h-5 w-5 text-indigo-600" /> Loading application…
      </div>
    )
  }

  const score = analysis?.matchScore ?? application.matchScore
  const noResume = resumes.length === 0
  const busy = analyzing || writing

  return (
    <div>
      <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
        ← Back to applications
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{application.jobTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {application.companyName} · added {formatDate(application.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={application.status} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="sr-only whitespace-nowrap sm:not-sr-only">Change status</span>
            <select
              aria-label="Change status"
              className={`${input} w-auto py-2`}
              value={application.status}
              disabled={statusSaving}
              onChange={(e) => changeStatus(e.target.value as ApplicationStatus)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {statusError && (
        <div className="mt-4">
          <Alert>{statusError}</Alert>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Which resume the AI should use */}
          <section className={`${card} p-6`}>
            <h2 className="text-base font-semibold text-slate-900">Resume</h2>
            {noResume ? (
              <div className="mt-3">
                <Alert kind="info">
                  Upload a resume first, then come back to analyze the match.{' '}
                  <Link to="/resumes" className="font-semibold underline">
                    Upload resume
                  </Link>
                </Alert>
              </div>
            ) : (
              <select
                aria-label="Resume"
                className={`${input} mt-3`}
                value={resumeId ?? ''}
                disabled={busy}
                onChange={(e) => setResumeId(Number(e.target.value))}
              >
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.fileName} (uploaded {formatDate(resume.createdAt)})
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* AI match analysis */}
          <section className={`${card} p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">AI match analysis</h2>
                <p className="mt-0.5 text-sm text-slate-500">How well does your resume fit this job?</p>
              </div>
              <button type="button" className={buttonPrimary} disabled={noResume || busy} onClick={analyze}>
                {analyzing && <Spinner />}
                {analyzing ? 'Analyzing…' : analysis || score !== null ? 'Analyze again' : 'Analyze match'}
              </button>
            </div>

            {analyzing && (
              <div className="mt-5 flex items-center gap-4 rounded-xl bg-indigo-50 px-5 py-4 text-indigo-900">
                <Spinner className="h-6 w-6 text-indigo-600" />
                <div className="text-sm">
                  <p className="font-semibold">The AI is reading your resume and the job description…</p>
                  <p className="text-indigo-700">This can take up to 60 seconds. {analyzeSeconds}s so far.</p>
                </div>
              </div>
            )}
            {analyzeError && (
              <div className="mt-5">
                <Alert>{analyzeError}</Alert>
              </div>
            )}

            {!analyzing && score !== null && (
              <div className="mt-6">
                <div className="flex items-center gap-5">
                  <div className="flex items-baseline">
                    <span className={`text-6xl font-extrabold tracking-tight ${scoreColor(score)}`}>{score}</span>
                    <span className="ml-1 text-xl font-semibold text-slate-400">/ 100</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {score >= 75 ? 'Strong match' : score >= 50 ? 'Partial match' : 'Weak match'}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    {analysisFromCache !== null && (
                      <p className="mt-2 text-xs text-slate-500">
                        {analysisFromCache ? 'Answered instantly from the cache.' : 'Fresh answer from the AI.'}
                      </p>
                    )}
                  </div>
                </div>

                {analysis ? (
                  <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
                    <SkillTags
                      title="Matching skills"
                      skills={analysis.matchingSkills}
                      color="bg-emerald-50 text-emerald-700 ring-emerald-200"
                      empty="The AI found no matching skills."
                    />
                    <SkillTags
                      title="Missing skills"
                      skills={analysis.missingSkills}
                      color="bg-rose-50 text-rose-700 ring-rose-200"
                      empty="The AI found no missing skills."
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Tips to improve your resume</h3>
                      <ol className="mt-2 space-y-2">
                        {analysis.resumeTips.map((tip, index) => (
                          <li key={tip} className="flex gap-3 text-sm text-slate-700">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                              {index + 1}
                            </span>
                            <span className="pt-0.5">{tip}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    This is the saved score. Click "Analyze again" to see the skills and tips.
                  </p>
                )}
              </div>
            )}

            {!analyzing && score === null && !analyzeError && (
              <p className="mt-5 rounded-xl bg-slate-50 px-5 py-4 text-sm text-slate-500">
                Not analyzed yet. Click "Analyze match" to get a score, matching and missing skills, and three tips.
              </p>
            )}
          </section>

          {/* AI cover letter */}
          <section className={`${card} p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Cover letter</h2>
                <p className="mt-0.5 text-sm text-slate-500">Written by the AI using only facts from your resume.</p>
              </div>
              <div className="flex gap-2">
                {application.coverLetter && !writing && (
                  <button type="button" className={buttonSecondary} onClick={copyCoverLetter}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                )}
                <button type="button" className={buttonPrimary} disabled={noResume || busy} onClick={writeCoverLetter}>
                  {writing && <Spinner />}
                  {writing ? 'Writing…' : application.coverLetter ? 'Generate again' : 'Generate cover letter'}
                </button>
              </div>
            </div>

            {writing && (
              <div className="mt-5 flex items-center gap-4 rounded-xl bg-indigo-50 px-5 py-4 text-indigo-900">
                <Spinner className="h-6 w-6 text-indigo-600" />
                <div className="text-sm">
                  <p className="font-semibold">The AI is writing your cover letter…</p>
                  <p className="text-indigo-700">This can take up to 60 seconds. {writingSeconds}s so far.</p>
                </div>
              </div>
            )}
            {letterError && (
              <div className="mt-5">
                <Alert>{letterError}</Alert>
              </div>
            )}
            {!writing && application.coverLetter && (
              <>
                <div className="mt-5 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-800">
                  {application.coverLetter}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {application.coverLetter.trim().split(/\s+/).length} words · Always read the letter and check the
                  facts before you send it.
                </p>
              </>
            )}
            {!writing && !application.coverLetter && !letterError && (
              <p className="mt-5 rounded-xl bg-slate-50 px-5 py-4 text-sm text-slate-500">
                No cover letter yet. Click "Generate cover letter" to let the AI write one.
              </p>
            )}
          </section>
        </div>

        {/* Job description */}
        <aside className="lg:col-span-2">
          <section className={`${card} p-6 lg:sticky lg:top-24`}>
            <h2 className="text-base font-semibold text-slate-900">Job description</h2>
            <p className="mt-3 max-h-[32rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {application.jobDescription}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

