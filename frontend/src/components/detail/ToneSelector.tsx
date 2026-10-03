import { TONES } from '../../api.ts'
import type { CoverLetterTone } from '../../api.ts'

// How the next cover letter should sound. Three radio buttons that look like one switch.
export default function ToneSelector({ value, onChange, disabled }: { value: CoverLetterTone; onChange: (tone: CoverLetterTone) => void; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled} className="min-w-0" data-testid="tone-selector">
      <legend className="text-sm font-medium">Tone</legend>
      <div className="mt-1.5 inline-flex rounded-lg bg-muted p-1">
        {TONES.map((tone) => (
          <label
            key={tone.value}
            title={tone.hint}
            className="flex min-h-9 cursor-pointer items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors has-checked:bg-card has-checked:text-foreground has-checked:shadow-xs has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-60"
          >
            <input type="radio" name="cover-letter-tone" value={tone.value} checked={value === tone.value} onChange={() => onChange(tone.value)} className="sr-only" />
            {tone.label}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{TONES.find((tone) => tone.value === value)?.hint}</p>
    </fieldset>
  )
}
