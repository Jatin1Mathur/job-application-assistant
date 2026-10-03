import { ArrowLeft, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, errorMessage } from '../api.ts'
import ErrorAlert from '../components/ErrorAlert.tsx'
import MotionButton from '../components/MotionButton.tsx'
import PageTransition from '../components/PageTransition.tsx'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'
import { Label } from '../components/ui/label.tsx'
import { Textarea } from '../components/ui/textarea.tsx'

const MIN_DESCRIPTION_LENGTH = 100

export default function NewApplicationPage() {
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const descriptionLength = jobDescription.trim().length
  const progress = Math.min(100, (descriptionLength / MIN_DESCRIPTION_LENGTH) * 100)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const application = await api.createApplication({ companyName, jobTitle, jobDescription })
      toast.success('Application created')
      navigate(`/applications/${application.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <PageTransition className="mx-auto max-w-2xl">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to applications
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">New application</h1>
      <p className="mt-1 text-sm text-muted-foreground">Paste the job posting. The AI compares it with your resume.</p>

      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border bg-card p-6 shadow-xs sm:p-8">
        {error && <ErrorAlert message={error} />}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company</Label>
            <Input
              id="companyName"
              className="h-10"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Siemens"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobTitle">Job title</Label>
            <Input
              id="jobTitle"
              className="h-10"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Backend Developer"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jobDescription">Job description</Label>
          <Textarea
            id="jobDescription"
            rows={12}
            className="min-h-56"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here…"
          />
          <div className="flex items-center gap-3 pt-1">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p
              className={`text-xs ${descriptionLength >= MIN_DESCRIPTION_LENGTH ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
            >
              {descriptionLength} characters · at least {MIN_DESCRIPTION_LENGTH} needed
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t pt-5">
          <Button asChild variant="outline" size="lg">
            <Link to="/">Cancel</Link>
          </Button>
          <MotionButton type="submit" size="lg" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Create application
          </MotionButton>
        </div>
      </form>
    </PageTransition>
  )
}
