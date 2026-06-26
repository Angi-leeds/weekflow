import type { TodayHighlightOptions } from '../types'
import {
  shouldShowTodayBadge,
  todayBadgeClass,
  todayBadgeLabel,
} from '../lib/todayHighlight'

interface TodayHighlightBadgeProps {
  isToday: boolean
  options: TodayHighlightOptions
  className?: string
}

export function TodayHighlightBadge({ isToday, options, className = '' }: TodayHighlightBadgeProps) {
  if (!shouldShowTodayBadge(isToday, options)) return null

  if (options.badge === 'dot') {
    return (
      <span
        className={`${todayBadgeClass(options)} ${className}`}
        aria-label="Today"
        title="Today"
      />
    )
  }

  return (
    <span className={`${todayBadgeClass(options)} ${className}`}>
      {todayBadgeLabel(options)}
    </span>
  )
}
