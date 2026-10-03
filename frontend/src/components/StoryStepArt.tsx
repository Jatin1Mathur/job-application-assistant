import { HERO_SKILLS } from '../three/galaxyData.ts'
import { BagDrawing } from './BackpackFallback.tsx'

// Where the skills sit in the still picture of step 2: close around the bag
const TIGHT: [number, number][] = [
  [348, 172],
  [152, 176],
  [362, 232],
  [140, 238],
  [344, 288],
  [158, 292],
]

// One still picture per step of "How it works". The moving 3D story shows the same three moments; this is
// what people see who asked for less motion, or whose browser has no WebGL.
export default function StoryStepArt({ step }: { step: number }) {
  const cx = 250
  const cy = 225
  const circumference = 2 * Math.PI * 46

  return (
    <svg viewBox="110 110 280 210" className="h-40 w-full" role="img" aria-label={LABELS[step - 1]} data-story-art={step}>
      {step === 1 && (
        <>
          {/* the resume, half way into the bag */}
          <g transform={`rotate(6 ${cx} ${cy - 90})`}>
            <rect x={cx - 24} y={cy - 108} width="48" height="62" rx="3" fill="#fbfaf7" stroke="var(--foreground)" strokeOpacity="0.25" />
            <path d={`M${cx - 16} ${cy - 97} h18`} stroke="#46413a" strokeWidth="3" />
            <path d={`M${cx - 16} ${cy - 86} h32 M${cx - 16} ${cy - 78} h26 M${cx - 16} ${cy - 70} h32`} stroke="#b0aba2" strokeWidth="2" />
          </g>
          <BagDrawing cx={cx} cy={cy} />
        </>
      )}
      {step === 2 && (
        <>
          <ellipse cx={cx} cy={cy + 8} rx="112" ry="78" fill="none" stroke="var(--foreground)" strokeOpacity="0.14" />
          <BagDrawing cx={cx} cy={cy} />
          {HERO_SKILLS.map((skill, index) => {
            const [x, y] = TIGHT[index]
            return (
              <g key={skill.name} opacity={skill.matching ? 1 : 0.55}>
                {skill.matching && <circle cx={x} cy={y} r="15" fill="var(--primary)" opacity="0.18" />}
                <circle cx={x} cy={y} r={skill.matching ? 7.5 : 5} fill={skill.matching ? 'var(--primary)' : 'var(--muted)'} stroke="var(--foreground)" strokeOpacity={skill.matching ? 0 : 0.3} />
              </g>
            )
          })}
        </>
      )}
      {step === 3 && (
        <>
          <g transform={`translate(${cx - 70} ${cy + 10}) scale(0.62) translate(${-cx} ${-cy})`}>
            <BagDrawing cx={cx} cy={cy} />
          </g>
          <g transform={`rotate(-90 ${cx + 68} ${cy - 8})`} fill="none" strokeWidth="11">
            <circle cx={cx + 68} cy={cy - 8} r="46" className="stroke-muted" />
            <circle cx={cx + 68} cy={cy - 8} r="46" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * 0.18} className="stroke-emerald-600 dark:stroke-emerald-400" />
          </g>
          <text x={cx + 68} y={cy + 2} textAnchor="middle" fontSize="30" fontWeight="700" className="fill-emerald-700 dark:fill-emerald-400">
            82
          </text>
        </>
      )}
    </svg>
  )
}

const LABELS = [
  'A resume sliding into the backpack',
  'Skills close around the backpack: the matching ones highlighted, the missing ones faded',
  'The backpack next to a score ring filled to 82 out of 100',
]
