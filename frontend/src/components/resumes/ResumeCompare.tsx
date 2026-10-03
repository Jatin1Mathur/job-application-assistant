import { X } from 'lucide-react'
import { motion } from 'motion/react'
import type { Insights, ResumeSummary } from '../../api.ts'
import { formatDate, scoreTone } from '../../lib/format.ts'
import { Button } from '../ui/button.tsx'
import ResumeThumbnail from './ResumeThumbnail.tsx'

type ResumeScore = Insights['scoreByResume'][number]

function Tags({ skills, tone }: { skills: string[]; tone: string }) {
  if (skills.length === 0) return <p className="text-sm text-muted-foreground">None</p>
  return (
    <ul className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <li key={skill} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
          {skill}
        </li>
      ))}
    </ul>
  )
}

function Side({ resume, score, letter }: { resume: ResumeSummary; score?: ResumeScore; letter: string }) {
  return (
    <div className="flex min-w-0 gap-4" data-testid={`compare-side-${letter}`}>
      <ResumeThumbnail resume={resume} width={104} />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">Resume {letter}</p>
        <p className="break-words text-sm font-semibold">{resume.fileName}</p>
        <p className="text-xs text-muted-foreground">Uploaded {formatDate(resume.createdAt)}</p>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Average match:</dt>
            <dd>
              {score ? (
                <>
                  <span className={`font-semibold tabular-nums ${scoreTone(score.averageScore).text}`}>{score.averageScore}</span>{' '}
                  <span className="text-xs text-muted-foreground">
                    from {score.analyses} {score.analyses === 1 ? 'analysis' : 'analyses'}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">not used in an analysis yet</span>
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Skills found:</dt>
            <dd className="font-semibold tabular-nums">{resume.detectedSkills.length}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

// Two resumes next to each other: their first pages, their average match scores, and which skills appear in
// both or only in one of them. The skills are the ones found in the text of each resume.
export default function ResumeCompare({ first, second, scores, onClose }: { first: ResumeSummary; second: ResumeSummary; scores: ResumeScore[]; onClose: () => void }) {
  const inSecond = new Set(second.detectedSkills)
  const inFirst = new Set(first.detectedSkills)
  const both = first.detectedSkills.filter((skill) => inSecond.has(skill))
  const onlyFirst = first.detectedSkills.filter((skill) => !inSecond.has(skill))
  const onlySecond = second.detectedSkills.filter((skill) => !inFirst.has(skill))
  const scoreOf = (resume: ResumeSummary) => scores.find((score) => score.resumeId === resume.id)

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border bg-card p-5 sm:p-6"
      aria-labelledby="compare-heading"
      data-testid="resume-compare"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="compare-heading" className="text-base font-semibold">
          Compare two resumes
        </h2>
        <Button variant="ghost" size="icon-lg" onClick={onClose} aria-label="Close the comparison">
          <X />
        </Button>
      </div>
      <div className="mt-3 grid gap-6 md:grid-cols-2">
        <Side resume={first} score={scoreOf(first)} letter="A" />
        <Side resume={second} score={scoreOf(second)} letter="B" />
      </div>
      <div className="mt-6 grid gap-5 border-t pt-5 md:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Only in A</h3>
          <Tags skills={onlyFirst} tone="bg-accent text-accent-foreground" />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">In both</h3>
          <Tags skills={both} tone="bg-muted text-foreground" />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Only in B</h3>
          <Tags skills={onlySecond} tone="bg-accent text-accent-foreground" />
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Skills are found by looking for well-known skill names in the text of each resume. A skill written in other words is not found.</p>
    </motion.section>
  )
}
