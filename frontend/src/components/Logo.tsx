// The mark: a rising line in the accent color. The same shape is the favicon.
export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex size-8 items-center justify-center rounded-[10px] ${light ? 'bg-white text-[#006375]' : 'bg-primary text-primary-foreground'}`}
      >
        <svg viewBox="0 0 32 32" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8 22c2.4-6 5.4-9.8 9.4-11.6M17.4 10.4l5.2-1-1.4 5.2" />
        </svg>
      </span>
      <span className={`whitespace-nowrap font-display text-lg font-semibold tracking-tight ${light ? 'text-white' : ''}`}>
        Job Assistant
      </span>
    </span>
  )
}
