import { ChevronsLeftRight } from 'lucide-react'
import { useRef } from 'react'
import HighlightedText from '../HighlightedText.tsx'
import { GENERIC_LETTER, LETTER_SKILLS, TAILORED_LETTER } from './sampleData.ts'

// "Generic vs tailored": two cover letters for the same job on top of each other, with a divider the visitor
// moves. Left of the divider is the generic letter, right of it the tailored one with the matching skills marked.
// The divider is a normal range input, so it works with the mouse, with touch and with the arrow keys.
export default function LetterCompare() {
  const frame = useRef<HTMLDivElement>(null)

  // The position is written straight into a CSS variable: moving the divider does not re-render React
  function move(value: string) {
    frame.current?.style.setProperty('--split', `${value}%`)
  }

  return (
    <section className="border-y bg-muted/50" aria-labelledby="letter-heading">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 id="letter-heading" className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
          Generic or tailored: drag to compare
        </h2>
        <p className="mt-4 max-w-[60ch] leading-relaxed text-muted-foreground">
          The same applicant, the same job. The tailored letter names the skills the posting asks for and says plainly
          which one is missing. Both letters are examples written for this page.
        </p>

        <div
          ref={frame}
          className="relative mt-8 overflow-hidden rounded-2xl border bg-card [--split:50%]"
          data-testid="letter-compare"
        >
          {/* Tailored letter: in the normal flow, so it sets the height of the frame */}
          <div className="p-5 pt-14 sm:p-8 sm:pt-16">
            <p className="whitespace-pre-line text-[15px] leading-relaxed">
              <HighlightedText text={TAILORED_LETTER} matching={LETTER_SKILLS} missing={[]} />
            </p>
          </div>
          <span className="absolute right-4 top-4 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">Tailored</span>

          {/* Generic letter: lies on top and is cut off at the divider */}
          <div className="absolute inset-0 bg-muted p-5 pt-14 [clip-path:inset(0_calc(100%-var(--split))_0_0)] sm:p-8 sm:pt-16" aria-hidden={false}>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{GENERIC_LETTER}</p>
            <span className="absolute left-4 top-4 rounded-md border bg-card px-2 py-1 text-xs font-semibold">Generic</span>
          </div>

          {/* The divider line and its handle follow the same variable */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-(--split) w-0.5 -translate-x-1/2 bg-primary">
            <span className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-card text-primary shadow-sm">
              <ChevronsLeftRight className="size-5" />
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={50}
            step={1}
            aria-label="Show more of the generic letter (right) or of the tailored letter (left)"
            onInput={(event) => move(event.currentTarget.value)}
            className="compare-range absolute inset-0 size-full cursor-ew-resize opacity-0"
          />
          {/* Focus ring for keyboard users, drawn on the frame because the input itself is invisible */}
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-ring/60 [input:focus-visible+&]:ring-3" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Drag the handle, or focus it and use the arrow keys.</p>
      </div>
    </section>
  )
}
