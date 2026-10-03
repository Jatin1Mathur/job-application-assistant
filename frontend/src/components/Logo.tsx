import { BriefcaseBusiness } from 'lucide-react'

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex size-9 items-center justify-center rounded-xl shadow-sm ${light ? 'bg-white/15 text-white ring-1 ring-white/25' : 'bg-primary text-primary-foreground'}`}
      >
        <BriefcaseBusiness className="size-5" />
      </span>
      <span className={`whitespace-nowrap text-base font-semibold tracking-tight ${light ? 'text-white' : ''}`}>
        Job Assistant
      </span>
    </span>
  )
}
