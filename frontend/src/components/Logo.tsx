import { BriefcaseBusiness } from 'lucide-react'

// The mark is the one place the accent color is always used: ink on lime, in light and dark mode
export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-9 -rotate-3 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-card">
        <BriefcaseBusiness className="size-5" strokeWidth={2.25} />
      </span>
      <span className={`whitespace-nowrap font-display text-lg font-semibold tracking-tight ${light ? 'text-white' : ''}`}>
        Job Assistant
      </span>
    </span>
  )
}
