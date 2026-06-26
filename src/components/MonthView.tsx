import { ChevronLeft, ChevronRight, Plus, UnfoldVertical } from 'lucide-react'
import type { DayItemEntry } from '../dateUtils'
import {
  formatMonthDayLabel,
  formatMonthYear,
  formatTime,
  getDayItemEntriesForColumn,
  getMonthGridFilled,
  getWeekSpanSegments,
  isSameDay,
  isToday,
  shouldShowMultiDaySpanBar,
  startOfWeek,
  toISODate,
} from '../dateUtils'
import type { CalendarItem, ItemDisplayOptions, WeekStartsOn } from '../types'
import { DEFAULT_ITEM_DISPLAY } from '../types'
import { MultiDaySpanBar } from './MultiDaySpanBar'

interface MonthViewProps {
  currentDate: Date
  selectedDay?: Date
  items: CalendarItem[]
  displayOptions?: ItemDisplayOptions
  weekStartsOn?: WeekStartsOn
  expandWeekRows?: boolean
  onExpandWeekRowsChange?: (expand: boolean) => void
  onDaySelect: (date: Date) => void
  onDayAdd?: (date: Date) => void
  onMonthChange: (date: Date) => void
  onItemTap?: (item: CalendarItem) => void
}

const MAX_VISIBLE_EVENTS = 3
const COLLAPSED_WEEK_MIN_PX = 104
const DATE_HEADER_PX = 32
const EVENT_ROW_PX = 19

function weekRowMinHeight(maxEvents: number, expandWeekRows: boolean): number | undefined {
  if (!expandWeekRows) return undefined
  return Math.max(COLLAPSED_WEEK_MIN_PX, DATE_HEADER_PX + maxEvents * EVENT_ROW_PX + 12)
}

function weekdayLabels(weekStartsOn: WeekStartsOn): string[] {
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return Array.from({ length: 7 }, (_, index) => labels[(weekStartsOn + index) % 7])
}

export function MonthView({
  currentDate,
  selectedDay,
  items,
  displayOptions = DEFAULT_ITEM_DISPLAY,
  weekStartsOn = 1,
  expandWeekRows = false,
  onExpandWeekRowsChange,
  onDaySelect,
  onDayAdd,
  onMonthChange,
  onItemTap,
}: MonthViewProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const weeks = getMonthGridFilled(year, month, weekStartsOn)
  const weekdayHeaders = weekdayLabels(weekStartsOn)
  const multiDayLayout = displayOptions.multiDayAllDayLayout ?? 'span-bar'

  return (
    <div className="px-4 pb-6">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, month - 1, 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wf-surface text-wf-accent shadow-[var(--shadow-card)] transition-transform active:scale-95"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <h2 className="truncate font-display text-title font-bold tracking-tight">
            {formatMonthYear(currentDate)}
          </h2>
          {onExpandWeekRowsChange && (
            <button
              type="button"
              role="switch"
              aria-checked={expandWeekRows}
              aria-label="Expand month weeks to show all events"
              title={expandWeekRows ? 'Showing all events' : 'Expand to show all events'}
              onClick={() => onExpandWeekRowsChange(!expandWeekRows)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold shadow-[var(--shadow-card)] transition-colors active:scale-[0.98] ${
                expandWeekRows
                  ? 'bg-wf-accent text-white'
                  : 'bg-wf-surface text-wf-text-secondary hover:bg-wf-accent-soft hover:text-wf-accent'
              }`}
            >
              <UnfoldVertical size={12} strokeWidth={2.25} aria-hidden />
              {expandWeekRows ? 'All' : 'Show all'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, month + 1, 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wf-surface text-wf-accent shadow-[var(--shadow-card)] transition-transform active:scale-95"
          aria-label="Next month"
        >
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-wf-border/60 bg-wf-surface shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-7 border-b border-wf-border/60 bg-wf-bg/60">
          {weekdayHeaders.map((label, i) => (
            <div
              key={i}
              className="py-2 text-center text-caption font-semibold text-wf-text-secondary"
            >
              {label}
            </div>
          ))}
        </div>

        {weeks.map((weekDays, weekIndex) => (
          <MonthWeekRow
            key={weekIndex}
            weekDays={weekDays}
            month={month}
            items={items}
            selectedDay={selectedDay}
            multiDayLayout={multiDayLayout}
            weekStartsOn={weekStartsOn}
            expandWeekRows={expandWeekRows}
            onDaySelect={onDaySelect}
            onDayAdd={onDayAdd}
            onItemTap={onItemTap}
          />
        ))}
      </div>
    </div>
  )
}

function MonthWeekRow({
  weekDays,
  month,
  items,
  selectedDay,
  multiDayLayout,
  weekStartsOn,
  expandWeekRows,
  onDaySelect,
  onDayAdd,
  onItemTap,
}: {
  weekDays: Date[]
  month: number
  items: CalendarItem[]
  selectedDay?: Date
  multiDayLayout: 'span-bar' | 'repeat-daily'
  weekStartsOn: WeekStartsOn
  expandWeekRows: boolean
  onDaySelect: (date: Date) => void
  onDayAdd?: (date: Date) => void
  onItemTap?: (item: CalendarItem) => void
}) {
  const weekStart = startOfWeek(weekDays[0], weekStartsOn)
  const spanSegments = getWeekSpanSegments(items, weekStart)
  const showSpanBar = shouldShowMultiDaySpanBar(spanSegments, multiDayLayout)
  const dayEntries = weekDays.map((day) =>
    getDayItemEntriesForColumn(items, day, multiDayLayout),
  )
  const maxEventsInWeek = Math.max(0, ...dayEntries.map((entries) => entries.length))
  const rowMinHeight = weekRowMinHeight(maxEventsInWeek, expandWeekRows)

  return (
    <div className="border-b border-wf-border/60 last:border-b-0">
      {showSpanBar && (
        <div className="border-b border-wf-border/40 bg-wf-bg/30">
          <MultiDaySpanBar
            segments={spanSegments}
            weekStart={weekStart}
            onItemTap={onItemTap}
            compact
            seamless
            showDayLabels={false}
          />
        </div>
      )}

      <div
        className={`grid grid-cols-7 divide-x divide-wf-border/60 ${expandWeekRows ? '' : 'min-h-[6.5rem]'}`}
        style={rowMinHeight != null ? { minHeight: rowMinHeight } : undefined}
      >
        {weekDays.map((day, dayIndex) => (
          <MonthDayCell
            key={toISODate(day)}
            day={day}
            inMonth={day.getMonth() === month}
            entries={dayEntries[dayIndex]}
            expandWeekRows={expandWeekRows}
            selected={selectedDay ? isSameDay(day, selectedDay) : false}
            onDaySelect={onDaySelect}
            onDayAdd={onDayAdd}
            onItemTap={onItemTap}
          />
        ))}
      </div>
    </div>
  )
}

function MonthDayCell({
  day,
  inMonth,
  entries,
  expandWeekRows,
  selected,
  onDaySelect,
  onDayAdd,
  onItemTap,
}: {
  day: Date
  inMonth: boolean
  entries: DayItemEntry[]
  expandWeekRows: boolean
  selected: boolean
  onDaySelect: (date: Date) => void
  onDayAdd?: (date: Date) => void
  onItemTap?: (item: CalendarItem) => void
}) {
  const today = isToday(day)
  const eventLimit = expandWeekRows ? entries.length : MAX_VISIBLE_EVENTS
  const visibleEntries = entries.slice(0, eventLimit)
  const overflowCount = expandWeekRows ? 0 : entries.length - visibleEntries.length

  return (
    <div
      className={`group relative flex h-full flex-col p-1.5 ${
        expandWeekRows ? '' : 'min-h-[6.5rem]'
      } ${inMonth ? 'bg-wf-surface' : 'bg-wf-bg/40'} ${
        selected ? 'ring-1 ring-inset ring-wf-accent/35' : ''
      } hover:bg-black/[0.02]`}
    >
      <div className="mb-1 flex items-start justify-between gap-1">
        <button
          type="button"
          onClick={() => onDaySelect(day)}
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-caption font-semibold ${
            today
              ? 'bg-wf-accent text-white'
              : inMonth
                ? 'text-wf-text hover:bg-black/[0.06]'
                : 'text-wf-text-tertiary hover:bg-black/[0.04]'
          }`}
          aria-label={`Open ${formatMonthDayLabel(day)}`}
        >
          {formatMonthDayLabel(day)}
        </button>

        {onDayAdd && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDayAdd(day)
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-wf-text-tertiary opacity-0 transition-opacity hover:bg-black/[0.06] hover:text-wf-accent group-hover:opacity-100"
            aria-label={`Add item on ${formatMonthDayLabel(day)}`}
          >
            <Plus size={12} strokeWidth={2.25} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-0.5">
        {visibleEntries.map((entry) => (
          <MonthEventChip
            key={`${entry.item.id}-${entry.spanPosition}`}
            entry={entry}
            onItemTap={onItemTap}
          />
        ))}

        {overflowCount > 0 && (
          <button
            type="button"
            onClick={() => onDaySelect(day)}
            className="w-full truncate px-1 text-left text-[10px] font-semibold text-wf-accent hover:underline"
          >
            +{overflowCount} more
          </button>
        )}
      </div>
    </div>
  )
}

function MonthEventChip({
  entry,
  onItemTap,
}: {
  entry: DayItemEntry
  onItemTap?: (item: CalendarItem) => void
}) {
  const { item } = entry
  const timePrefix =
    !item.allDay && item.startTime ? `${formatTime(item.startTime)} ` : ''

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onItemTap?.(item)
      }}
      className="flex w-full min-w-0 items-center overflow-hidden rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-opacity hover:opacity-90 active:scale-[0.99]"
      style={{
        backgroundColor: `${item.colour}28`,
        borderLeft: `2px solid ${item.colour}`,
      }}
      title={`${timePrefix}${item.title}`}
    >
      <span className="truncate font-medium text-wf-text">
        {timePrefix && (
          <span className="font-semibold tabular-nums text-wf-text-secondary">{timePrefix}</span>
        )}
        {item.title}
      </span>
    </button>
  )
}

export { toISODate }
