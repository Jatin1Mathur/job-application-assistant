import { useReducedMotion } from 'motion/react'
import { useState } from 'react'

interface Part {
  id: string
  name: string
  role: string
  text: string
}

const PARTS: Part[] = [
  { id: 'react', name: 'React', role: 'Frontend', text: 'The pages you see: a React app in the browser that talks to the backend through a JSON API.' },
  { id: 'spring', name: 'Spring Boot', role: 'Backend', text: 'The backend checks the login token, reads the text of the PDF, stores the data and asks the AI model.' },
  { id: 'postgres', name: 'PostgreSQL', role: 'Database', text: 'The database keeps users, resumes, applications and analyses; Flyway keeps its tables in step with the code.' },
  { id: 'redis', name: 'Redis', role: 'Cache', text: 'The cache remembers finished analyses, so the same resume and job posting are not sent to the AI model twice.' },
  { id: 'ollama', name: 'Ollama', role: 'AI model', text: 'Ollama runs the language model (llama3.2) on the same machine, so resume text is not sent to a cloud AI service.' },
]

type Box = { x: number; y: number; w: number; h: number }

// Two drawings of the same diagram: left to right for wide screens, top to bottom for narrow ones
const WIDE = {
  view: '0 0 760 260',
  boxes: { react: { x: 10, y: 100, w: 160, h: 60 }, spring: { x: 270, y: 100, w: 180, h: 60 }, postgres: { x: 570, y: 14, w: 180, h: 60 }, redis: { x: 570, y: 100, w: 180, h: 60 }, ollama: { x: 570, y: 186, w: 180, h: 60 } } as Record<string, Box>,
  lines: ['M170 130 H270', 'M450 130 C515 130 505 44 570 44', 'M450 130 H570', 'M450 130 C515 130 505 216 570 216'],
}
const TALL = {
  view: '0 0 340 372',
  boxes: { react: { x: 90, y: 6, w: 160, h: 60 }, spring: { x: 80, y: 146, w: 180, h: 60 }, postgres: { x: 2, y: 306, w: 108, h: 60 }, redis: { x: 116, y: 306, w: 108, h: 60 }, ollama: { x: 230, y: 306, w: 108, h: 60 } } as Record<string, Box>,
  lines: ['M170 66 V146', 'M170 206 C170 262 56 250 56 306', 'M170 206 V306', 'M170 206 C170 262 284 250 284 306'],
}

function Drawing({ layout, className, active, onPick, dots }: { layout: typeof WIDE; className: string; active: string | null; onPick: (id: string) => void; dots: boolean }) {
  return (
    <svg viewBox={layout.view} className={className} role="group" aria-label="Architecture: React talks to Spring Boot, which uses PostgreSQL, Redis and Ollama">
      {layout.lines.map((line, index) => (
        <g key={line}>
          <path d={line} fill="none" stroke="var(--foreground)" strokeOpacity="0.22" strokeWidth="1.5" />
          {/* The dots stand for requests travelling from one part to the next */}
          {dots &&
            [0, 1].map((n) => (
              <circle key={n} r="3.5" fill="var(--primary)">
                <animateMotion dur={index === 0 ? '2.4s' : '3.2s'} begin={`${n * (index === 0 ? 1.2 : 1.6) + index * 0.35}s`} repeatCount="indefinite" path={line} />
              </circle>
            ))}
        </g>
      ))}
      {PARTS.map((part) => {
        const box = layout.boxes[part.id]
        const selected = active === part.id
        return (
          <g
            key={part.id}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`${part.name}, ${part.role}. ${part.text}`}
            data-part={part.id}
            className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[3] [&:focus-visible>rect]:[stroke:var(--ring)]"
            onClick={() => onPick(part.id)}
            onMouseEnter={() => onPick(part.id)}
            onFocus={() => onPick(part.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onPick(part.id)
              }
            }}
          >
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              rx="12"
              fill={selected ? 'color-mix(in oklch, var(--primary) 12%, var(--card))' : 'var(--card)'}
              stroke={selected ? 'var(--primary)' : 'var(--border)'}
              strokeWidth={selected ? 2 : 1.5}
            />
            <text x={box.x + box.w / 2} y={box.y + 27} textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--foreground)">
              {part.name}
            </text>
            <text x={box.x + box.w / 2} y={box.y + 45} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
              {part.role}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// "How it's built": the five parts of the system and how a request travels through them.
// Hovering, tapping or focusing a part shows one sentence about it below the diagram.
export default function ArchitectureDiagram() {
  const reducedMotion = useReducedMotion()
  const [active, setActive] = useState<string | null>(null)
  const part = PARTS.find((candidate) => candidate.id === active)

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="built-heading">
      <h2 id="built-heading" className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
        How it's built
      </h2>
      <p className="mt-4 max-w-[60ch] leading-relaxed text-muted-foreground">
        Five parts, all running on one machine. Hover over a part, tap it, or reach it with the Tab key.
      </p>
      <div className="mt-10">
        <Drawing layout={WIDE} className="mx-auto hidden w-full max-w-3xl sm:block" active={active} onPick={setActive} dots={!reducedMotion} />
        <Drawing layout={TALL} className="mx-auto w-full max-w-sm sm:hidden" active={active} onPick={setActive} dots={!reducedMotion} />
      </div>
      <p className="mx-auto mt-8 min-h-18 max-w-2xl border-l-2 border-primary pl-4 leading-relaxed" aria-live="polite" data-testid="part-text">
        {part ? (
          <>
            <span className="font-semibold">{part.name}. </span>
            {part.text}
          </>
        ) : (
          <span className="text-muted-foreground">A request starts in the browser, goes to the backend, and from there to the database, the cache or the AI model.</span>
        )}
      </p>
    </section>
  )
}
