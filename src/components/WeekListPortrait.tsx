import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions, TodayHighlightOptions } from '../types'
import { DEFAULT_TODAY_HIGHLIGHT } from '../types'
import { getWeekDays, getWeekSpanSegments, shouldShowMultiDaySpanBar } from '../dateUtils'
import { DayCardFromDate } from './DayCard'
import { MultiDaySpanBar } from './MultiDaySpanBar'

interface WeekListPortraitProps {
  weekStart: Date
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  showHeading?: boolean
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function WeekListPortrait({
  weekStart,
  items,
  categories,
  listOptions,
  displayOptions,
  todayHighlight = DEFAULT_TODAY_HIGHLIGHT,
  showHeading = true,
  onItemTap,
  onToggleComplete,
}: WeekListPortraitProps) {
  const days = getWeekDays(weekStart)
  const spanSegments = getWeekSpanSegments(items, weekStart)
  const multiDayLayout = displayOptions?.multiDayAllDayLayout ?? 'span-bar'
  const showSpanBar = shouldShowMultiDaySpanBar(spanSegments, multiDayLayout)

  return (
    <div className="w-full min-w-0 space-y-3 px-4 pb-6 pt-1">
      {showHeading && (
        <p className="px-1 text-subhead font-semibold text-wf-text-secondary">This week</p>
      )}

      {showSpanBar && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-wf-border bg-wf-surface shadow-[var(--shadow-card)]">
          <MultiDaySpanBar
            segments={spanSegments}
            weekStart={weekStart}
            onItemTap={onItemTap}
            compact
            seamless
          />
        </div>
      )}

      {days.map((day) => (
        <DayCardFromDate
          key={day.toISOString()}
          date={day}
          allItems={items}
          categories={categories}
          listOptions={listOptions}
          displayOptions={displayOptions}
          todayHighlight={todayHighlight}
          excludeMultiDayAllDay={multiDayLayout === 'span-bar'}
          onItemTap={onItemTap}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </div>
  )
}
