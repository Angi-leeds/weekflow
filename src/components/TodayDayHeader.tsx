import type { CSSProperties } from 'react'
import { formatDayColumnHeader, formatDayNumber, isToday } from '../dateUtils'
import type { DateHeaderDisplayOptions, TodayHighlightOptions } from '../types'
import { DEFAULT_DATE_HEADER_DISPLAY } from '../types'
import {
  resolveTodayDatePresentation,
  resolveTodayWeekdayPresentation,
  type TodayDateSize,
} from '../lib/todayHighlight'
import { DayHeaderMetaLabels } from './DayHeaderMetaLabels'
import { TodayHighlightBadge } from './TodayHighlightBadge'

interface TodayDayHeaderProps {
  date: Date
  options: TodayHighlightOptions
  dateHeaderDisplay?: DateHeaderDisplayOptions
  size?: TodayDateSize
  showWeekday?: boolean
  showBadge?: boolean
  className?: string
  style?: CSSProperties
}

export function TodayDayHeader({
  date,
  options,
  dateHeaderDisplay = DEFAULT_DATE_HEADER_DISPLAY,
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
  const showMeta = dateHeaderDisplay.showWeekNumber || dateHeaderDisplay.showDayOfYear

  return (
    <div className={`relative flex items-center gap-1 ${className}`} style={style}>
      {showMeta && (
        <DayHeaderMetaLabels date={date} display={dateHeaderDisplay} className="pl-0.5 pt-0.5" />
      )}
      <div className={`min-w-0 flex-1 text-center ${showMeta ? '' : ''}`}>
        {showWeekday && (
          <p className={weekday.className} style={weekday.style}>
            {formatDayColumnHeader(date)}
          </p>
        )}
        <p className={dateNum.className} style={dateNum.style}>
          {formatDayNumber(date)}
        </p>
      </div>
      {showBadge && options.badge === 'corner' && (
        <TodayHighlightBadge isToday={today} options={options} />
      )}
    </div>
  )
}
