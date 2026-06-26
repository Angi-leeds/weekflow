import {
  formatCompactOffsetFromToday,
  formatVerboseOffsetFromToday,
} from '../lib/dateOffset'

interface DateOffsetBadgeProps {
  date: Date
  className?: string
}

export function DateOffsetBadge({ date, className = '' }: DateOffsetBadgeProps) {
  const label = formatCompactOffsetFromToday(date)
  if (!label) return null

  return (
    <span
      className={`shrink-0 rounded-full bg-wf-bg px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-wf-text-secondary ring-1 ring-wf-border/80 ${className}`}
      title={formatVerboseOffsetFromToday(date)}
    >
      {label}
    </span>
  )
}
