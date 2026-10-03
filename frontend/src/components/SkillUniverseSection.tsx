import { lazy } from 'react'
import Lazy3D from './Lazy3D.tsx'

const SkillUniverse = lazy(() => import('../three/SkillUniverse.tsx'))

interface Skill {
  skill: string
  applications: number
}

// The static version: the same skills as flat bubbles, bigger = missing more often
function UniverseFallback({ skills }: { skills: Skill[] }) {
  const max = Math.max(...skills.map((skill) => skill.applications))
  return (
    <ul className="flex size-full flex-wrap content-center items-center justify-center gap-3 p-4" data-testid="universe-fallback">
      {skills.map((skill) => {
        const size = 64 + 56 * (skill.applications / max)
        return (
          <li
            key={skill.skill}
            style={{ width: size, height: size }}
            className="flex flex-col items-center justify-center rounded-full bg-brand/80 p-2 text-center text-brand-foreground ring-1 ring-inset ring-foreground/15"
          >
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{skill.skill}</span>
            <span className="text-[10px] tabular-nums">{skill.applications}</span>
          </li>
        )
      })}
    </ul>
  )
}

// The 3D "skill universe" of the insights page, with its static fallback
export default function SkillUniverseSection({ skills, analyzed }: { skills: Skill[]; analyzed: number }) {
  return (
    <Lazy3D
      label={`The skills you are missing most often: ${skills.map((skill) => `${skill.skill} in ${skill.applications}`).join(', ')}`}
      className="relative h-72 w-full overflow-hidden rounded-xl bg-muted/40 sm:h-96"
      fallback={<UniverseFallback skills={skills} />}
      scene={(props) => <SkillUniverse {...props} skills={skills} analyzed={analyzed} />}
    />
  )
}
