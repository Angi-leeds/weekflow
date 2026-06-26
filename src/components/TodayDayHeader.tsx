import type { CSSProperties } from 'react'
import { formatDayColumnHeader, formatDayNumber, isToday } from '../dateUtils'
import type { TodayHighlightOptions } from '../types'
import {
  resolveTodayDatePresentation,
  resolveTodayWeekdayPresentation,
  type TodayDateSize,
} from '../lib/todayHighlight'
import { TodayHighlightBadge } from './TodayHighlightBadge'

interface TodayDayHeaderProps {
  date: Date
  options: TodayHighlightOptions
  size?: TodayDateSize
  showWeekday?: boolean
  showBadge?: boolean
  className?: string
  style?: CSSProperties
}

export function TodayDayHeader({
  date,
  options,
  size = 'md',
  showWeekday = true,
  showBadge = false,
  className = '',
  style,
}: TodayDayHeaderProps) {
  const today = isToday(date)
  const onSolid = today && options.backgroundMode === 'solid'
  const weekday = resolveTodayWeekdayPresentation(today, options, size)
  const dateNum = resolveTodayDatePresentation(today, options, size, onSolid)

  return (
    <div className={`relative text-center ${className}`} style={style}>
      {showWeekday && (
        <p className={weekday.className} style={weekday.style}>
          {formatDayColumnHeader(date)}
        </p>
      )}
      <p className={dateNum.className} style={dateNum.style}>
        {formatDayNumber(date)}
      </p>
      {showBadge && options.badge === 'corner' && (
        <TodayHighlightBadge isToday={today} options={options} />
      )}
    </div>
  )
}
