import type { LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { TabsList, TabsTrigger } from './ui/tabs.tsx'

export interface TabOption {
  value: string
  label: string
  icon?: LucideIcon
}

// A row of tabs where the highlight slides from the old tab to the new one.
// The highlight is one element with a layoutId, so Motion moves it instead of making it jump.
// Must be used inside <Tabs>.
export default function AnimatedTabsList({
  id,
  value,
  options,
  label,
}: {
  // Unique per tab row, so two rows on one page do not share a highlight
  id: string
  value: string
  options: TabOption[]
  label: string
}) {
  return (
    <TabsList aria-label={label} className="group-data-horizontal/tabs:h-9">
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => (
        <TabsTrigger
          key={optionValue}
          value={optionValue}
          // The built-in active background is switched off; the sliding highlight below replaces it
          className="z-0 px-2.5 data-active:bg-transparent data-active:shadow-none! dark:data-active:border-transparent dark:data-active:bg-transparent"
        >
          {value === optionValue && (
            <motion.span
              layoutId={`tab-highlight-${id}`}
              className="absolute inset-0 -z-10 rounded-md bg-background shadow-card dark:bg-input/40"
              transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            />
          )}
          {Icon && <Icon />}
          {optionLabel}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
