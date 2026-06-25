import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions } from '../types'
import {
  formatDayColumnHeader,
  formatDayNumber,
  getDayItemEntriesForColumn,
  getWeekDays,
  getWeekSpanSegments,
  isToday,
  shouldShowMultiDaySpanBar,
} from '../dateUtils'
import { GroupedItemList } from './GroupedItemList'
import { MultiDaySpanBar } from './MultiDaySpanBar'

interface WeekBoardLandscapeProps {
  weekStart: Date
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function WeekBoardLandscape({
  weekStart,
  items,
  categories,
  listOptions,
  displayOptions,
  onItemTap,
  onToggleComplete,
}: WeekBoardLandscapeProps) {
  const days = getWeekDays(weekStart)
  const spanSegments = getWeekSpanSegments(items, weekStart)
  const multiDayLayout = displayOptions?.multiDayAllDayLayout ?? 'span-bar'
  const hasSpans = shouldShowMultiDaySpanBar(spanSegments, multiDayLayout)

  return (
    <div className="grid h-full min-h-0 grid-cols-7 grid-rows-[auto_auto_1fr] px-3 pb-4">
      {days.map((day, i) => {
        const today = isToday(day)
        return (
          <header
            key={`h-${day.toISOString()}`}
            className={`border-b border-wf-border px-1 py-2.5 text-center ${
              i < 6 ? 'border-r' : ''
            } ${today ? 'bg-wf-accent-soft' : 'bg-wf-surface'}`}
          >
            <p className={`text-caption font-semibold ${today ? 'text-wf-accent' : 'text-wf-text-secondary'}`}>
              {formatDayColumnHeader(day)}
            </p>
            <p className={`font-display text-[20px] font-bold leading-none ${today ? 'text-wf-accent' : 'text-wf-text'}`}>
              {formatDayNumber(day)}
            </p>
          </header>
        )
      })}

      {hasSpans && (
        <div className="col-span-7 border-b border-wf-border bg-wf-surface py-1.5">
          <MultiDaySpanBar
            segments={spanSegments}
            weekStart={weekStart}
            onItemTap={onItemTap}
            showDayLabels={false}
            seamless
          />
        </div>
      )}

      {days.map((day, i) => {
        const entries = getDayItemEntriesForColumn(items, day, multiDayLayout)
        const today = isToday(day)

        return (
          <div
            key={`c-${day.toISOString()}`}
            className={`min-h-0 overflow-y-auto bg-wf-surface p-1.5 ${
              i < 6 ? 'border-r border-wf-border' : ''
            } ${today ? 'bg-wf-accent-soft/20' : ''}`}
          >
            <GroupedItemList
              entries={entries}
              viewDate={day}
              categories={categories}
              listOptions={listOptions}
              displayOptions={displayOptions}
              compact
              emptyMessage="—"
              onItemTap={onItemTap}
              onToggleComplete={onToggleComplete}
            />
          </div>
        )
      })}
    </div>
  )
}
