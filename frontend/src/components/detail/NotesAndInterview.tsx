import { CalendarClock, Loader2, NotebookPen } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { api, errorMessage } from '../../api.ts'
import type { Application } from '../../api.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import { Textarea } from '../ui/textarea.tsx'

const MAX_NOTES = 5000

// "2026-10-05T08:00:00Z" -> "2026-10-05T10:00" in the browser's own time zone: what a datetime-local field wants
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// The user's own notes about the application and, if there is one, the date and time of the interview.
// Both are saved together with one button, and nothing is saved while typing.
export default function NotesAndInterview({ application, onSaved }: { application: Application; onSaved: (application: Application) => void }) {
  const [notes, setNotes] = useState(application.notes ?? '')
  const [interview, setInterview] = useState(toLocalInput(application.interviewAt))
  const [saving, setSaving] = useState(false)

  const changed = notes.trim() !== (application.notes ?? '') || interview !== toLocalInput(application.interviewAt)

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const saved = await api.updateDetails(application.id, {
        notes: notes.trim() || null,
        // The field holds local time; the backend stores the exact moment
        interviewAt: interview ? new Date(interview).toISOString() : null,
      })
      onSaved(saved)
      setNotes(saved.notes ?? '')
      setInterview(toLocalInput(saved.interviewAt))
      toast.success('Notes and interview date saved')
    } catch (err) {
      toast.error('Could not save', { description: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} data-testid="notes-form">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <NotebookPen className="size-4 text-primary" aria-hidden /> Notes and interview
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Only you see these. An interview in the next three days appears under "Next actions" on the dashboard.</p>

      <div className="mt-4">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={MAX_NOTES} rows={4} placeholder="Who you talked to, what to prepare, what to ask" className="mt-1.5" />
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="interview-at" className="flex items-center gap-1.5">
            <CalendarClock className="size-4 text-muted-foreground" aria-hidden /> Interview date and time
          </Label>
          <Input id="interview-at" type="datetime-local" value={interview} onChange={(event) => setInterview(event.target.value)} className="mt-1.5 h-10 w-60 max-w-full" />
        </div>
        {interview && (
          <Button type="button" variant="ghost" size="lg" onClick={() => setInterview('')}>
            Remove date
          </Button>
        )}
        <Button type="submit" size="lg" disabled={!changed || saving} className="ml-auto">
          {saving && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  )
}
