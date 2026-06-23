import type { SpanPosition } from '../dateUtils'
import {
  formatDateRangeShort,
  formatTime,
  formatTimeRange,
  getItemEndDate,
  getSpanDayNumber,
  getSpanTotalDays,
  isMultiDay,
} from '../dateUtils'
import type { CalendarItem, Category } from '../types'
import { getCategoryName } from '../categories'
import { isTaskOrReminder } from './itemHelpers'
import { Badge } from './ui/Badge'

interface CalendarItemRowProps {
  item: CalendarItem
  categories: Category[]
  spanPosition?: SpanPosition
  compact?: boolean
  hideCategoryBadge?: boolean
  onTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
  viewDate?: Date
}

export function CalendarItemRow({
  item,
  categories,
  spanPosition = 'single',
  compact = false,
  hideCategoryBadge = false,
  onTap,
  onToggleComplete,
  viewDate,
}: CalendarItemRowProps) {
  const isTask = isTaskOrReminder(item, categories)
  const completed = item.completed ?? false
  const showNotes = item.notes && (spanPosition === 'start' || spanPosition === 'single')

  return (
    <button
      type="button"
      onClick={() => onTap?.(item)}
      className={`group flex w-full gap-0 overflow-hidden rounded-xl text-left transition-all hover:bg-black/[0.02] active:scale-[0.99] active:bg-black/[0.04] ${
        completed ? 'opacity-55' : ''
      } ${compact ? 'my-1' : 'my-1.5'}`}
    >
      <span
        className="w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: item.colour }}
        aria-hidden
      />

      <span className={`min-w-0 flex-1 ${compact ? 'py-2 pr-2 pl-2.5' : 'py-2.5 pr-3 pl-2.5'}`}>
        <span className="mb-0.5 flex items-center justify-between gap-2">
          <TimeLabel
            item={item}
            spanPosition={spanPosition}
            isTask={isTask}
            compact={compact}
            viewDate={viewDate}
          />
          {!compact && !hideCategoryBadge && (
            <Badge label={getCategoryName(categories, item.categoryId)} colour={item.colour} variant="default" />
          )}
        </span>

        <span className="flex items-start gap-2">
          {isTask && (
            <span
              role="checkbox"
              aria-checked={completed}
              onClick={(e) => {
                e.stopPropagation()
                onToggleComplete?.(item.id)
              }}
              className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                completed
                  ? 'border-wf-green bg-wf-green text-white scale-100'
                  : 'border-wf-text-tertiary group-hover:border-wf-accent'
              }`}
            >
              {completed && (
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span
              className={`block font-medium leading-snug text-wf-text ${
                compact ? 'text-[13px]' : 'text-body'
              } ${completed ? 'line-through decoration-wf-text-tertiary' : ''}`}
            >
              {item.title}
            </span>
            {!compact && showNotes && (
              <span className="mt-0.5 block truncate text-subhead text-wf-text-tertiary">
                {item.notes}
              </span>
            )}
          </span>
        </span>
      </span>
    </button>
  )
}

function TimeLabel({
  item,
  spanPosition,
  isTask,
  compact,
  viewDate,
}: {
  item: CalendarItem
  spanPosition: SpanPosition
  isTask: boolean
  compact: boolean
  viewDate?: Date
}) {
  const sizeClass = compact ? 'text-[11px]' : 'text-subhead'

  if (isMultiDay(item) && item.allDay && !isTask) {
    if (spanPosition === 'start' || spanPosition === 'single') {
      return (
        <span className={`tabular-nums font-semibold text-wf-text-secondary ${sizeClass}`}>
          {formatDateRangeShort(item.date, getItemEndDate(item))}
        </span>
      )
    }
    if (spanPosition === 'end') {
      return (
        <span className={`font-medium text-wf-text-secondary ${sizeClass}`}>
          Ends today
        </span>
      )
    }
    if (spanPosition === 'middle' && viewDate) {
      const dayNum = getSpanDayNumber(item, viewDate)
      const total = getSpanTotalDays(item)
      return (
        <span className={`font-medium text-wf-text-secondary ${sizeClass}`}>
          Day {dayNum} of {total}
        </span>
      )
    }
  }

  if (item.allDay && !isTask) {
    return (
      <span className={`tabular-nums font-medium text-wf-text-secondary ${sizeClass}`}>
        All day
      </span>
    )
  }

  if (item.startTime && spanPosition === 'start' && isMultiDay(item) && !item.allDay) {
    return (
      <span className={`tabular-nums font-semibold text-wf-text-secondary ${sizeClass}`}>
        {formatTime(item.startTime)} → {formatDateRangeShort(item.date, getItemEndDate(item))}
      </span>
    )
  }

  if (item.startTime) {
    return (
      <span className={`tabular-nums font-semibold text-wf-text-secondary ${sizeClass}`}>
        {item.endTime
          ? formatTimeRange(item.startTime, item.endTime)
          : formatTime(item.startTime)}
      </span>
    )
  }

  if (isTask) {
    return (
      <span className={`font-medium text-wf-text-tertiary ${sizeClass}`}>
        Anytime
      </span>
    )
  }

  return null
}
