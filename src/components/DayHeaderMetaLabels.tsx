import { getDayOfYear, getISOWeekNumber } from '../dateUtils'
import type { DateHeaderDisplayOptions } from '../types'

interface DayHeaderMetaLabelsProps {
  date: Date
  display: DateHeaderDisplayOptions
  className?: string
}

export function DayHeaderMetaLabels({ date, display, className = '' }: DayHeaderMetaLabelsProps) {
  if (!display.showWeekNumber && !display.showDayOfYear) return null

  const week = getISOWeekNumber(date)
  const dayOfYear = getDayOfYear(date)

  return (
    <div
      className={`flex shrink-0 flex-col items-start leading-none text-[9px] font-semibold tabular-nums text-wf-text-tertiary ${className}`}
      aria-hidden
    >
      {display.showWeekNumber && (
        <span title={`ISO week ${week}`}>W{week}</span>
      )}
      {display.showDayOfYear && (
        <span title={`Day ${dayOfYear} of ${date.getFullYear()}`}>D{dayOfYear}</span>
      )}
    </div>
  )
}
