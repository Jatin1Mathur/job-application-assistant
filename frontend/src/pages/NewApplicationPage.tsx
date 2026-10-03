import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api.ts'
import Alert from '../components/Alert.tsx'
import Spinner from '../components/Spinner.tsx'
import { buttonPrimary, buttonSecondary, card, input, label } from '../ui.ts'

const MIN_DESCRIPTION_LENGTH = 100

export default function NewApplicationPage() {
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const descriptionLength = jobDescription.trim().length

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const application = await api.createApplication({ companyName, jobTitle, jobDescription })
      navigate(`/applications/${application.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
        ← Back to applications
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">New application</h1>
      <p className="mt-1 text-sm text-slate-500">Paste the job posting. The AI compares it with your resume.</p>

      <form onSubmit={submit} className={`${card} mt-6 space-y-5 p-6 sm:p-8`}>
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="companyName" className={label}>
              Company
            </label>
            <input
              id="companyName"
              className={input}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Siemens"
            />
          </div>
          <div>
            <label htmlFor="jobTitle" className={label}>
              Job title
            </label>
            <input
              id="jobTitle"
              className={input}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Backend Developer"
            />
          </div>
        </div>
        <div>
          <label htmlFor="jobDescription" className={label}>
            Job description
          </label>
          <textarea
            id="jobDescription"
            rows={12}
            className={input}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here…"
          />
          <p
            className={`mt-1.5 text-xs ${descriptionLength >= MIN_DESCRIPTION_LENGTH ? 'text-emerald-600' : 'text-slate-500'}`}
          >
            {descriptionLength} characters · at least {MIN_DESCRIPTION_LENGTH} needed
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Link to="/" className={buttonSecondary}>
            Cancel
          </Link>
          <button type="submit" disabled={saving} className={buttonPrimary}>
            {saving && <Spinner />}
            Create application
          </button>
        </div>
      </form>
    </div>
  )
}
