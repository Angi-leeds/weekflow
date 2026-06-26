import type { TodayHighlightOptions } from '../types'
import {
  shouldShowTodayBadge,
  todayBadgeLabel,
  todayBadgePresentation,
} from '../lib/todayHighlight'

interface TodayHighlightBadgeProps {
  isToday: boolean
  options: TodayHighlightOptions
  className?: string
}

export function TodayHighlightBadge({ isToday, options, className = '' }: TodayHighlightBadgeProps) {
  if (!shouldShowTodayBadge(isToday, options)) return null

  const badge = todayBadgePresentation(options)

  if (options.badge === 'dot') {
    return (
      <span
        className={`${badge.className} ${className}`}
        style={badge.style}
        aria-label="Today"
        title="Today"
      />
    )
  }

  return (
    <span className={`${badge.className} ${className}`} style={badge.style}>
      {todayBadgeLabel(options)}
    </span>
  )
}
