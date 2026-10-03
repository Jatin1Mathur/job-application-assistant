import { Fragment } from 'react'

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Shows a text with the given skills marked: matching skills in green, missing skills in red.
// A skill is found wherever its exact words appear, ignoring upper and lower case.
export default function HighlightedText({
  text,
  matching,
  missing,
}: {
  text: string
  matching: string[]
  missing: string[]
}) {
  const kinds = new Map<string, 'matching' | 'missing'>()
  for (const skill of missing) if (skill.trim()) kinds.set(skill.trim().toLowerCase(), 'missing')
  for (const skill of matching) if (skill.trim()) kinds.set(skill.trim().toLowerCase(), 'matching')

  if (kinds.size === 0) {
    return <>{text}</>
  }

  // Longest first, so "Spring Boot" is marked as one skill and not only its "Spring" part.
  // The lookarounds stop "Java" from being found inside "JavaScript".
  const alternatives = [...kinds.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${alternatives})(?![\\p{L}\\p{N}])`, 'giu')

  return (
    <>
      {text.split(pattern).map((part, index) => {
        const kind = index % 2 === 1 ? kinds.get(part.toLowerCase()) : undefined
        if (!kind) {
          return <Fragment key={index}>{part}</Fragment>
        }
        return (
          <mark
            key={index}
            data-kind={kind}
            className={`rounded px-1 py-0.5 font-medium ${
              kind === 'matching'
                ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-500/20 text-rose-800 dark:text-rose-200'
            }`}
          >
            {part}
          </mark>
        )
      })}
    </>
  )
}
