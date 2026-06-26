import type { DayItemEntry } from '../dateUtils'
import { formatDayHeader, getDayItemEntries, getDayItemEntriesForColumn, isToday, toISODate } from '../dateUtils'
import type { CalendarItem, Category, ItemDisplayOptions, DateHeaderDisplayOptions, ListDisplayOptions, TodayHighlightOptions } from '../types'
import { DEFAULT_DATE_HEADER_DISPLAY, DEFAULT_TODAY_HIGHLIGHT } from '../types'
import {
  daySelectionClass,
  mergeHighlightStyle,
  resolveTodayHighlight,
  resolveTodayTitlePresentation,
} from '../lib/todayHighlight'
import { DayHeaderMetaLabels } from './DayHeaderMetaLabels'
import { GroupedItemList } from './GroupedItemList'
import { TodayHighlightBadge } from './TodayHighlightBadge'
import { useDayContextMenu } from '../hooks/useCalendarContextMenu'

interface DayCardProps {
  date: Date
  entries: DayItemEntry[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  dateHeaderDisplay?: DateHeaderDisplayOptions
  selected?: boolean
  onSelectDate?: (date: Date) => void
  compact?: boolean
  dense?: boolean
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function DayCard({
  date,
  entries,
  categories,
  listOptions,
  displayOptions,
  todayHighlight = DEFAULT_TODAY_HIGHLIGHT,
  dateHeaderDisplay = DEFAULT_DATE_HEADER_DISPLAY,
  selected = false,
  onSelectDate,
  compact = false,
  dense = false,
  onItemTap,
  onToggleComplete,
}: DayCardProps) {
  const today = isToday(date)
  const dayMenu = useDayContextMenu(date)
  const cardHighlight = resolveTodayHighlight(today, todayHighlight, 'day-card')
  const headerHighlight = resolveTodayHighlight(today, todayHighlight, 'day-card-header')
  const mergedCard = mergeHighlightStyle(cardHighlight)
  const mergedHeader = mergeHighlightStyle(headerHighlight)
  const onSolid = todayHighlight.backgroundMode === 'solid' && today
  const title = resolveTodayTitlePresentation(today, todayHighlight, onSolid)
  const selectionClass = daySelectionClass(selected, today)

  return (
    <article
      {...dayMenu}
      className={`relative overflow-hidden rounded-[var(--radius-lg)] bg-wf-surface shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)] ${mergedCard.className} ${selectionClass}`}
      style={mergedCard.style}
    >
      <header
        className={`relative flex items-center justify-between gap-2 border-b border-wf-border px-4 py-3 ${mergedHeader.className} ${selectionClass}`}
        style={mergedHeader.style}
      >
        <button
          type="button"
          onClick={() => onSelectDate?.(date)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-label={`Select ${formatDayHeader(date)}`}
          aria-pressed={selected}
        >
          <DayHeaderMetaLabels date={date} display={dateHeaderDisplay} />
          <h3 className={title.className} style={title.style}>
            {formatDayHeader(date)}
          </h3>
        </button>
        <TodayHighlightBadge isToday={today} options={todayHighlight} />
      </header>

      <div className={dense ? 'px-0.5 py-1' : 'px-2 py-2'}>
        <GroupedItemList
          entries={entries}
          viewDate={date}
          categories={categories}
          listOptions={listOptions}
          displayOptions={displayOptions}
          compact={compact}
          dense={dense}
          onItemTap={onItemTap}
          onToggleComplete={onToggleComplete}
        />
      </div>
    </article>
  )
}

interface DayCardFromDateProps {
  date: Date
  allItems: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  dateHeaderDisplay?: DateHeaderDisplayOptions
  selected?: boolean
  onSelectDate?: (date: Date) => void
  excludeMultiDayAllDay?: boolean
  compact?: boolean
  dense?: boolean
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function DayCardFromDate({
  date,
  allItems,
  categories,
  listOptions,
  displayOptions,
  todayHighlight,
  excludeMultiDayAllDay,
  ...rest
}: DayCardFromDateProps) {
  const entries = excludeMultiDayAllDay
    ? getDayItemEntriesForColumn(allItems, date, 'span-bar')
    : getDayItemEntries(allItems, date)
  return (
    <DayCard
      date={date}
      entries={entries}
      categories={categories}
      listOptions={listOptions}
      displayOptions={displayOptions}
      todayHighlight={todayHighlight}
      {...rest}
    />
  )
}

export { toISODate }
