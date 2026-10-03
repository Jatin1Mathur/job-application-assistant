import { ArrowLeft, Check, Columns2, Copy, Download, FileText, History, Lightbulb, Loader2, PenLine, Sparkles, Trash2, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api, errorMessage, STATUSES, TONES } from '../api.ts'
import type { Application, ApplicationStatus, CoverLetterTone, MatchAnalysis, ResumeSummary } from '../api.ts'
import NotesAndInterview from '../components/detail/NotesAndInterview.tsx'
import StatusTimeline from '../components/detail/StatusTimeline.tsx'
import ToneSelector from '../components/detail/ToneSelector.tsx'
import AiSteps from '../components/AiSteps.tsx'
import AnimatedTabsList from '../components/AnimatedTabsList.tsx'
import HighlightedText from '../components/HighlightedText.tsx'
import ErrorAlert from '../components/ErrorAlert.tsx'
import MotionButton from '../components/MotionButton.tsx'
import PageTransition from '../components/PageTransition.tsx'
import ScoreDisplay from '../components/ScoreDisplay.tsx'
import { StatusDot } from '../components/StatusBadge.tsx'
import { Button } from '../components/ui/button.tsx'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog.tsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.tsx'
import { Skeleton } from '../components/ui/skeleton.tsx'
import { Tabs, TabsContent } from '../components/ui/tabs.tsx'
import { celebrateOffer } from '../lib/celebrate.ts'
import { formatDate, formatRelativeDate, scoreTone } from '../lib/format.ts'
import { popItem, staggerItem, staggerList } from '../lib/motion.ts'
import { statusLabel } from '../lib/status.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

const ANALYZE_STEPS = ['Reading your resume…', 'Comparing skills…', 'Writing tips…']
const LETTER_STEPS = ['Reading your resume…', 'Studying the job posting…', 'Writing your cover letter…']

const section = 'rounded-xl border bg-card p-6'

// Skill tags that pop in one after another: green for matching skills, red for missing ones
function SkillTags({ title, skills, kind }: { title: string; skills: string[]; kind: 'matching' | 'missing' }) {
  const color =
    kind === 'matching'
      ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300'
      : 'bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300'
  return (
    <div>
      <h3 className="text-sm font-semibold">
        {title} <span className="font-normal text-muted-foreground">({skills.length})</span>
      </h3>
      {skills.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">The AI found no {kind} skills.</p>
      ) : (
        <motion.ul variants={staggerList} initial="hidden" animate="show" className="mt-2.5 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <motion.li
              key={skill}
              variants={popItem}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${color}`}
            >
              {skill}
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading application">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
      </div>
    </div>
  )
}

export default function ApplicationDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  // Coming from the dashboard, the card hands over the application it already has. The header can then be
  // drawn at once, which is what lets the card grow into it (shared layoutId). Fresh data still loads below.
  const handedOver = (useLocation().state as { application?: Application } | null)?.application
  const [application, setApplication] = useState<Application | null>(handedOver?.id === id ? handedOver : null)
  // True once the application and the resumes have come back from the backend
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState('overview')
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [resumeId, setResumeId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // The full analysis is stored by the backend and comes with the application
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null)
  // The resume text for the compare view; loaded only when that tab is opened
  const [resumeText, setResumeText] = useState<{ resumeId: number; text: string } | null>(null)
  const [resumeTextError, setResumeTextError] = useState<string | null>(null)
  // Changes after every analysis, so the ring and the tags animate again
  const [analysisRun, setAnalysisRun] = useState(0)
  const [analysisFromCache, setAnalysisFromCache] = useState<boolean | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [writing, setWriting] = useState(false)
  const [letterError, setLetterError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // The tone for the next letter. Starts with the tone of the stored letter, once that is known.
  const [tone, setTone] = useState<CoverLetterTone>('FORMAL')
  const [exporting, setExporting] = useState(false)

  usePageTitle(application ? `${application.jobTitle} at ${application.companyName}` : 'Application')

  const [statusSaving, setStatusSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    Promise.all([api.getApplication(id), api.listResumes()])
      .then(([loadedApplication, loadedResumes]) => {
        setApplication(loadedApplication)
        setAnalysis(loadedApplication.analysis)
        if (loadedApplication.coverLetterTone) setTone(loadedApplication.coverLetterTone)
        setResumes(loadedResumes)
        // Start with the resume of the last analysis, if it still exists; otherwise the newest one
        const analyzedResume = loadedResumes.find((resume) => resume.id === loadedApplication.analysis?.resumeId)
        setResumeId(analyzedResume?.id ?? loadedResumes[0]?.id ?? null)
        setLoaded(true)
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
      setAnalysisRun((run) => run + 1)
      // Load the application again to get the stored analysis with its date and model name
      setApplication(await api.getApplication(id))
      toast.success(`Match score: ${result.analysis.matchScore} out of 100`, {
        description: result.cached ? 'Answered instantly from the cache.' : 'Fresh analysis from the AI.',
      })
    } catch (err) {
      setAnalyzeError(errorMessage(err))
      toast.error('The analysis did not finish', { description: errorMessage(err) })
    } finally {
      setAnalyzing(false)
    }
  }

  async function writeCoverLetter() {
    if (resumeId === null) return
    setLetterError(null)
    setWriting(true)
    try {
      const result = await api.generateCoverLetter(id, resumeId, tone)
      setApplication((current) => current && { ...current, coverLetter: result.coverLetter, coverLetterTone: result.tone })
      toast.success('Cover letter drafted')
    } catch (err) {
      setLetterError(errorMessage(err))
      toast.error('Could not write the cover letter', { description: errorMessage(err) })
    } finally {
      setWriting(false)
    }
  }

  // Asks the backend for the letter as a PDF and hands it to the browser as a download
  async function exportCoverLetter() {
    if (!application) return
    setExporting(true)
    try {
      const pdf = await api.getCoverLetterPdf(id)
      const url = URL.createObjectURL(pdf)
      const link = document.createElement('a')
      link.href = url
      link.download = `cover-letter-${application.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'application'}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error('Could not export the PDF', { description: errorMessage(err) })
    } finally {
      setExporting(false)
    }
  }

  async function copyCoverLetter() {
    if (!application?.coverLetter) return
    try {
      await navigator.clipboard.writeText(application.coverLetter)
      setCopied(true)
      toast.success('Copied to the clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy', { description: 'Select the text and copy it by hand.' })
    }
  }

  async function changeStatus(status: ApplicationStatus) {
    setStatusSaving(true)
    try {
      setApplication(await api.updateStatus(id, status))
      toast.success(`Status changed to ${statusLabel(status)}`)
      if (status === 'OFFER') celebrateOffer()
    } catch (err) {
      toast.error('Could not change the status', { description: errorMessage(err) })
    } finally {
      setStatusSaving(false)
    }
  }

  // The compare view shows the text of the chosen resume. It is fetched the first time the tab is opened
  function loadResumeText() {
    if (resumeId === null || resumeText?.resumeId === resumeId) return
    setResumeText(null)
    setResumeTextError(null)
    api
      .getResume(resumeId)
      .then((resume) => setResumeText({ resumeId: resume.id, text: resume.extractedText }))
      .catch((err) => setResumeTextError(errorMessage(err)))
  }

  async function deleteApplication() {
    setDeleting(true)
    try {
      await api.deleteApplication(id)
      toast.success('Application deleted')
      navigate('/dashboard')
    } catch (err) {
      toast.error('Could not delete the application', { description: errorMessage(err) })
      setDeleting(false)
    }
  }

  if (loadError) {
    return (
      <PageTransition className="mx-auto max-w-2xl space-y-4">
        <ErrorAlert message={loadError} />
        <Button asChild variant="outline" size="lg">
          <Link to="/dashboard">
            <ArrowLeft /> Back to applications
          </Link>
        </Button>
      </PageTransition>
    )
  }

  if (!application) {
    return (
      <PageTransition>
        <DetailSkeleton />
      </PageTransition>
    )
  }

  const score = analysis?.matchScore ?? application.matchScore
  const noResume = resumes.length === 0
  const busy = analyzing || writing

  return (
    <PageTransition>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to applications
      </Link>

      {/* Same layoutId as the card on the dashboard: Motion animates the card's box into this header */}
      <motion.div
        layoutId={`application-${application.id}`}
        transition={{ type: 'spring', duration: 0.38, bounce: 0.12 }}
        className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5 sm:p-6"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold sm:text-3xl">{application.jobTitle}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {application.companyName} · added {formatRelativeDate(application.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={application.status}
            disabled={statusSaving}
            onValueChange={(value) => changeStatus(value as ApplicationStatus)}
          >
            <SelectTrigger aria-label="Change status" className="data-[size=default]:h-10 min-w-40 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  <StatusDot status={status} />
                  {statusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {!loaded ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-5" aria-busy="true" aria-label="Loading application">
          <div className="space-y-6 lg:col-span-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
      ) : (
      <Tabs
        value={tab}
        className="mt-6"
        onValueChange={(next) => {
          setTab(next)
          if (next === 'compare') loadResumeText()
        }}
      >
        <AnimatedTabsList
          id="detail"
          label="Sections"
          value={tab}
          options={[
            { value: 'overview', label: 'Overview', icon: Sparkles },
            { value: 'compare', label: 'Compare', icon: Columns2 },
          ]}
        />

        <TabsContent value="overview" className="animate-in fade-in-0 duration-200">
      <motion.div variants={staggerList} initial="hidden" animate="show" className="mt-4 grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-3">
          {/* AI match analysis */}
          <motion.section variants={staggerItem} className={section}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Sparkles className="size-4 text-primary" /> Match analysis
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">How well does your resume fit this job?</p>
              </div>
              {/* One filled button at a time: the filled one is the next step, the other is outlined */}
              <MotionButton size="lg" variant={score === null ? 'default' : 'outline'} disabled={noResume || busy} onClick={analyze}>
                {analyzing ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {analyzing ? 'Analyzing…' : score !== null ? 'Analyze again' : 'Analyze match'}
              </MotionButton>
            </div>

            <AnimatePresence initial={false}>
              {analyzing && <AiSteps key="steps" steps={ANALYZE_STEPS} />}
            </AnimatePresence>

            {analyzeError && !analyzing && (
              <div className="mt-5">
                <ErrorAlert message={analyzeError} />
              </div>
            )}

            {!analyzing && score !== null && (
              <motion.div
                key={analysisRun}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                <div className="flex flex-wrap items-center gap-6">
                  <ScoreDisplay score={score} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-lg font-semibold ${scoreTone(score).text}`}>{scoreTone(score).label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {score >= 75
                        ? 'Your resume covers most of what this job asks for.'
                        : score >= 50
                          ? 'Your resume covers part of what this job asks for.'
                          : 'Your resume is missing much of what this job asks for.'}
                    </p>
                    {analysisFromCache !== null && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        <Zap className="size-3" />
                        {analysisFromCache ? 'Answered instantly from the cache' : 'Fresh answer from the AI'}
                      </p>
                    )}
                  </div>
                </div>

                {application.analysis && (
                  <p className="mt-4 text-xs text-muted-foreground" data-testid="analysis-meta">
                    Analyzed on {formatDate(application.analysis.analyzedAt)} with {application.analysis.modelName}
                  </p>
                )}

                {analysis ? (
                  <div className="mt-5 space-y-5 border-t pt-5">
                    <SkillTags title="Matching skills" skills={analysis.matchingSkills} kind="matching" />
                    <SkillTags title="Missing skills" skills={analysis.missingSkills} kind="missing" />
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Lightbulb className="size-4 text-amber-500" /> Tips to improve your resume
                      </h3>
                      <motion.ol variants={staggerList} initial="hidden" animate="show" className="mt-2.5 space-y-2.5">
                        {analysis.resumeTips.map((tip, index) => (
                          <motion.li key={tip} variants={staggerItem} className="flex gap-3 text-sm">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                              {index + 1}
                            </span>
                            <span className="pt-0.5 text-foreground/85">{tip}</span>
                          </motion.li>
                        ))}
                      </motion.ol>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    This is the saved score. Analyze again to see the skills and tips.
                  </p>
                )}
              </motion.div>
            )}

            {!analyzing && score === null && !analyzeError && (
              <p className="mt-5 rounded-lg bg-muted/60 px-4 py-3.5 text-sm text-muted-foreground">
                Not analyzed yet. Analyze the match to see your score, the skills you already have, the skills to work on, and three tips for your resume.
              </p>
            )}
          </motion.section>

          {/* AI cover letter */}
          <motion.section variants={staggerItem} className={section}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <PenLine className="size-4 text-primary" /> Cover letter
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Drafted from the facts in your resume. Nothing is invented.
                </p>
              </div>
              {application.coverLetter && !writing && (
                <div className="flex gap-2">
                  <MotionButton variant="outline" size="lg" onClick={copyCoverLetter}>
                    {copied ? <Check className="text-emerald-500" /> : <Copy />}
                    {copied ? 'Copied' : 'Copy'}
                  </MotionButton>
                  <MotionButton variant="outline" size="lg" onClick={exportCoverLetter} disabled={exporting} data-testid="export-pdf">
                    {exporting ? <Loader2 className="animate-spin" /> : <Download />}
                    Export PDF
                  </MotionButton>
                </div>
              )}
            </div>

            {/* Choose the tone, then generate. With a letter already there, the button writes a new one. */}
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-lg bg-muted/50 p-3.5">
              <ToneSelector value={tone} onChange={setTone} disabled={noResume || busy} />
              <MotionButton
                size="lg"
                variant={score !== null && !application.coverLetter ? 'default' : 'outline'}
                disabled={noResume || busy}
                onClick={writeCoverLetter}
                data-testid="generate-letter"
              >
                {writing ? <Loader2 className="animate-spin" /> : <PenLine />}
                {writing ? 'Writing…' : application.coverLetter ? 'Regenerate' : 'Generate cover letter'}
              </MotionButton>
            </div>

            <AnimatePresence initial={false}>
              {writing && <AiSteps key="steps" steps={LETTER_STEPS} />}
            </AnimatePresence>

            {letterError && !writing && (
              <div className="mt-5">
                <ErrorAlert message={letterError} />
              </div>
            )}

            {!writing && application.coverLetter && (
              // The key is the letter itself, so a newly generated letter fades in again
              <motion.div
                key={application.coverLetter}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <div
                  data-testid="cover-letter"
                  className="mt-5 max-w-[68ch] whitespace-pre-wrap border-y py-5 text-[0.9375rem] leading-relaxed"
                >
                  {application.coverLetter}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {application.coverLetter.trim().split(/\s+/).length} words
                  {application.coverLetterTone && `, ${TONES.find((item) => item.value === application.coverLetterTone)?.label.toLowerCase()} tone`}. Read it through and
                  check the facts before you send it.
                </p>
              </motion.div>
            )}

            {!writing && !application.coverLetter && !letterError && (
              <p className="mt-5 rounded-lg bg-muted/60 px-4 py-3.5 text-sm text-muted-foreground">
                No cover letter yet. Generate one, then edit it until it sounds like you.
              </p>
            )}
          </motion.section>

          {/* Notes and interview date. The key resets the fields when another application is opened. */}
          <motion.section variants={staggerItem} className={section}>
            <NotesAndInterview key={application.id} application={application} onSaved={setApplication} />
          </motion.section>
        </div>

        {/* The two things being compared: the resume and the job description */}
        <motion.aside variants={staggerItem} className="min-w-0 lg:col-span-2">
          <div className={`${section} space-y-6 lg:sticky lg:top-24`}>
            {application.statusHistory.length > 0 && (
              <section className="border-b pb-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4 text-muted-foreground" aria-hidden /> Status timeline
                </h2>
                <StatusTimeline history={application.statusHistory} />
              </section>
            )}
            <section>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-muted-foreground" /> Resume used
              </h2>
            {noResume ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-encourage px-4 py-3 text-sm text-encourage-foreground">
                <span>Upload your resume first. Then you can check the match and write a cover letter.</span>
                <Button asChild size="lg">
                  <Link to="/resumes">Upload resume</Link>
                </Button>
              </div>
            ) : (
              <Select
                value={resumeId === null ? undefined : String(resumeId)}
                disabled={busy}
                onValueChange={(value) => setResumeId(Number(value))}
              >
                <SelectTrigger
                  aria-label="Resume"
                  className="mt-3 w-full min-w-0 data-[size=default]:h-10 *:data-[slot=select-value]:block *:data-[slot=select-value]:truncate"
                >
                  <SelectValue placeholder="Choose a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((resume) => (
                    <SelectItem key={resume.id} value={String(resume.id)}>
                      {resume.fileName} · {formatDate(resume.createdAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            </section>
            <section className="border-t pt-5">
              <h2 className="text-sm font-semibold">Job description</h2>
              <p
                className={`mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground ${descriptionOpen ? '' : 'line-clamp-[12]'}`}
              >
                {application.jobDescription}
              </p>
              {application.jobDescription.length > 600 && (
                <button
                  type="button"
                  onClick={() => setDescriptionOpen(!descriptionOpen)}
                  aria-expanded={descriptionOpen}
                  className="mt-2 rounded text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {descriptionOpen ? 'Show less' : 'Show the full description'}
                </button>
              )}
            </section>
          </div>
        </motion.aside>
      </motion.div>
        </TabsContent>

        {/* Resume text and job description next to each other, with the skills from the analysis marked */}
        <TabsContent value="compare" className="animate-in fade-in-0 duration-200">
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground" data-testid="compare-legend">
            {analysis ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded bg-emerald-500/30 ring-1 ring-emerald-500/40" /> Matching skill
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded bg-rose-500/30 ring-1 ring-rose-500/40" /> Missing skill
                </span>
                <span>A skill is marked where its exact words appear in the text.</span>
              </>
            ) : (
              <span>Run "Analyze match" on the Overview tab to see matching and missing skills marked here.</span>
            )}
          </div>
          <div className="mt-3 grid gap-6 lg:grid-cols-2">
            <section className={`${section} min-w-0`} data-testid="compare-resume">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <FileText className="size-4 text-muted-foreground" /> Your resume
              </h2>
              {noResume ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No resume yet.{' '}
                  <Link to="/resumes" className="font-semibold text-primary hover:underline">
                    Upload one
                  </Link>{' '}
                  to compare it with this job.
                </p>
              ) : resumeTextError ? (
                <div className="mt-3">
                  <ErrorAlert message={resumeTextError} />
                </div>
              ) : resumeText === null ? (
                <div className="mt-4 space-y-2.5" aria-busy="true" aria-label="Loading resume text">
                  {[0, 1, 2, 3, 4, 5].map((line) => (
                    <Skeleton key={line} className="h-3.5" style={{ width: `${95 - line * 9}%` }} />
                  ))}
                </div>
              ) : (
                <p className="mt-3 max-h-[36rem] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85">
                  <HighlightedText
                    text={resumeText.text}
                    matching={analysis?.matchingSkills ?? []}
                    missing={analysis?.missingSkills ?? []}
                  />
                </p>
              )}
            </section>
            <section className={`${section} min-w-0`} data-testid="compare-job">
              <h2 className="text-base font-semibold">Job description</h2>
              <p className="mt-3 max-h-[36rem] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85">
                <HighlightedText
                  text={application.jobDescription}
                  matching={analysis?.matchingSkills ?? []}
                  missing={analysis?.missingSkills ?? []}
                />
              </p>
            </section>
          </div>
        </TabsContent>
      </Tabs>
      )}

      {/* Deleting is rare and cannot be undone, so it sits at the end of the page, away from the status control */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <p className="text-sm text-muted-foreground">No longer interested in this job?</p>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="lg" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 /> Delete application
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this application?</DialogTitle>
              <DialogDescription>
                "{application.jobTitle}" at {application.companyName} will be removed, together with its match score
                and cover letter. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="lg">
                  Keep it
                </Button>
              </DialogClose>
              <Button variant="destructive" size="lg" disabled={deleting} onClick={deleteApplication}>
                {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}
