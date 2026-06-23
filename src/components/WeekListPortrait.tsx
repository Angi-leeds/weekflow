import type { CalendarItem, Category, ListDisplayOptions } from '../types'
import { getWeekDays, getWeekSpanSegments } from '../dateUtils'
import { DayCardFromDate } from './DayCard'
import { MultiDaySpanBar } from './MultiDaySpanBar'

interface WeekListPortraitProps {
  weekStart: Date
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function WeekListPortrait({
  weekStart,
  items,
  categories,
  listOptions,
  onItemTap,
  onToggleComplete,
}: WeekListPortraitProps) {
  const days = getWeekDays(weekStart)
  const spanSegments = getWeekSpanSegments(items, weekStart)

  return (
    <div className="space-y-3 px-4 pb-6 pt-1">
      <p className="px-1 text-subhead font-semibold text-wf-text-secondary">This week</p>

      {spanSegments.length > 0 && (
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
          excludeMultiDayAllDay
          onItemTap={onItemTap}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </div>
  )
}
