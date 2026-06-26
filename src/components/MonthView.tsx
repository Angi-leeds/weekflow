import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, UnfoldVertical } from 'lucide-react'
import type { DayItemEntry, WeekSpanSegment } from '../dateUtils'
import {
  formatMonthDayLabel,
  formatMonthYear,
  formatTime,
  getDayItemEntriesForColumn,
  getMonthGridFilled,
  getWeekSpanSegments,
  isSameDay,
  isToday,
  startOfWeek,
  toISODate,
} from '../dateUtils'
import { useScrollPan } from '../hooks/useScrollPan'
import { useDayContextMenu, useItemContextMenu } from '../hooks/useCalendarContextMenu'
import type { CalendarItem, ItemDisplayOptions, TodayHighlightOptions, WeekStartsOn } from '../types'
import { DEFAULT_ITEM_DISPLAY, DEFAULT_TODAY_HIGHLIGHT } from '../types'
import {
  mergeHighlightStyle,
  resolveTodayDateClass,
  resolveTodayHighlight,
} from '../lib/todayHighlight'

interface MonthViewProps {
  currentDate: Date
  selectedDay?: Date
  items: CalendarItem[]
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  weekStartsOn?: WeekStartsOn
  expandWeekRows?: boolean
  onExpandWeekRowsChange?: (expand: boolean) => void
  onDaySelect: (date: Date) => void
  onDayAdd?: (date: Date) => void
  onMonthChange: (date: Date) => void
  onItemTap?: (item: CalendarItem) => void
}

const MAX_VISIBLE_EVENTS = 3
const COLLAPSED_EVENTS_MIN_PX = 72
const DATE_HEADER_PX = 32
const EVENT_ROW_PX = 19
const SPAN_ROW_PX = 19
const CELL_PADDING_PX = 12
const INITIAL_MONTHS_BEFORE = 2
const INITIAL_MONTHS_AFTER = 4
const LOAD_MONTH_BATCH = 2

function monthAnchor(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1)
}

function listMonths(from: Date, to: Date): Date[] {
  const months: Date[] = []
  let cursor = monthAnchor(from)
  const end = monthAnchor(to)
  while (cursor <= end) {
    months.push(new Date(cursor))
    cursor = addMonths(cursor, 1)
  }
  return months
}

function weekRowMinHeight(
  laneCount: number,
  maxSingleDayEvents: number,
  expandWeekRows: boolean,
): number | undefined {
  if (!expandWeekRows) return undefined
  const eventArea = Math.max(COLLAPSED_EVENTS_MIN_PX, maxSingleDayEvents * EVENT_ROW_PX)
  return DATE_HEADER_PX + laneCount * SPAN_ROW_PX + eventArea + CELL_PADDING_PX
}

function monthCellBorderClass(colIndex: number, inMonth: boolean, extra = ''): string {
  return [
    'border-b border-r border-wf-border/80 p-1.5',
    colIndex === 6 ? 'border-r-0' : '',
    inMonth ? 'bg-wf-surface' : 'bg-wf-bg/40',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
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
  todayHighlight = DEFAULT_TODAY_HIGHLIGHT,
  weekStartsOn = 1,
  expandWeekRows = false,
  onExpandWeekRowsChange,
  onDaySelect,
  onDayAdd,
  onMonthChange,
  onItemTap,
}: MonthViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const monthSectionRefs = useRef(new Map<string, HTMLElement>())
  const lastExternalMonthKey = useRef(monthKey(monthAnchor(currentDate)))
  const scrollRaf = useRef<number | null>(null)
  const hasInitialScroll = useRef(false)

  const anchor = monthAnchor(currentDate)
  const [rangeStart, setRangeStart] = useState(() => addMonths(anchor, -INITIAL_MONTHS_BEFORE))
  const [rangeEnd, setRangeEnd] = useState(() => addMonths(anchor, INITIAL_MONTHS_AFTER))
  const [visibleMonth, setVisibleMonth] = useState(anchor)

  const months = listMonths(rangeStart, rangeEnd)
  const weekdayHeaders = weekdayLabels(weekStartsOn)
  const multiDayLayout = displayOptions.multiDayAllDayLayout ?? 'span-bar'

  const registerMonthSection = useCallback((date: Date, node: HTMLElement | null) => {
    const key = monthKey(date)
    if (node) monthSectionRefs.current.set(key, node)
    else monthSectionRefs.current.delete(key)
  }, [])

  const scrollToMonth = useCallback((target: Date, behavior: ScrollBehavior = 'smooth') => {
    const el = monthSectionRefs.current.get(monthKey(target))
    el?.scrollIntoView({ behavior, block: 'start' })
  }, [])

  const ensureMonthInRange = useCallback((target: Date) => {
    const t = monthAnchor(target)
    setRangeStart((prev) => (t < prev ? addMonths(t, -INITIAL_MONTHS_BEFORE) : prev))
    setRangeEnd((prev) => (t > prev ? addMonths(t, INITIAL_MONTHS_AFTER) : prev))
  }, [])

  const setVisibleMonthLocal = useCallback((month: Date) => {
    const next = monthAnchor(month)
    setVisibleMonth((prev) => (monthKey(next) === monthKey(prev) ? prev : next))
  }, [])

  useEffect(() => {
    const key = monthKey(visibleMonth)
    if (key === lastExternalMonthKey.current) return
    lastExternalMonthKey.current = key
    onMonthChange(visibleMonth)
  }, [visibleMonth, onMonthChange])

  const prependMonths = useCallback((count: number) => {
    const el = scrollRef.current
    if (!el) return
    const prevHeight = el.scrollHeight
    setRangeStart((prev) => addMonths(prev, -count))
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!scrollRef.current) return
        scrollRef.current.scrollTop += scrollRef.current.scrollHeight - prevHeight
      })
    })
  }, [])

  const appendMonths = useCallback((count: number) => {
    setRangeEnd((prev) => addMonths(prev, count))
  }, [])

  const navigateMonth = useCallback(
    (delta: number) => {
      const target = addMonths(visibleMonth, delta)
      ensureMonthInRange(target)
      setVisibleMonthLocal(target)
      requestAnimationFrame(() => scrollToMonth(target))
    },
    [ensureMonthInRange, scrollToMonth, setVisibleMonthLocal, visibleMonth],
  )

  const updateVisibleMonthFromScroll = useCallback(() => {
    const root = scrollRef.current
    if (!root) return
    const anchorY = root.getBoundingClientRect().top + 8
    let closest: Date | null = null
    let closestDistance = Infinity

    for (const [key, section] of monthSectionRefs.current) {
      const dist = Math.abs(section.getBoundingClientRect().top - anchorY)
      if (dist < closestDistance) {
        closestDistance = dist
        const [year, month] = key.split('-').map(Number)
        closest = new Date(year, month, 1)
      }
    }

    if (closest) setVisibleMonthLocal(closest)
  }, [setVisibleMonthLocal])

  useLayoutEffect(() => {
    if (hasInitialScroll.current) return
    hasInitialScroll.current = true
    const target = monthAnchor(currentDate)
    ensureMonthInRange(target)
    setVisibleMonth(target)
    lastExternalMonthKey.current = monthKey(target)
    requestAnimationFrame(() => scrollToMonth(target, 'auto'))
  }, [currentDate, ensureMonthInRange, scrollToMonth])

  useEffect(() => {
    const key = monthKey(monthAnchor(currentDate))
    if (key === lastExternalMonthKey.current) return
    lastExternalMonthKey.current = key
    const target = monthAnchor(currentDate)
    ensureMonthInRange(target)
    setVisibleMonth(target)
    requestAnimationFrame(() => scrollToMonth(target, 'auto'))
  }, [currentDate, ensureMonthInRange, scrollToMonth])

  useEffect(() => {
    const root = scrollRef.current
    const top = topSentinelRef.current
    const bottom = bottomSentinelRef.current
    if (!root || !top || !bottom) return

    const topObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) prependMonths(LOAD_MONTH_BATCH)
      },
      { root, rootMargin: '120px 0px 0px 0px', threshold: 0 },
    )
    const bottomObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) appendMonths(LOAD_MONTH_BATCH)
      },
      { root, rootMargin: '0px 0px 120px 0px', threshold: 0 },
    )

    topObserver.observe(top)
    bottomObserver.observe(bottom)
    return () => {
      topObserver.disconnect()
      bottomObserver.disconnect()
    }
  }, [appendMonths, prependMonths, rangeStart, rangeEnd])

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const onScroll = () => {
      if (scrollRaf.current != null) return
      scrollRaf.current = window.requestAnimationFrame(() => {
        scrollRaf.current = null
        updateVisibleMonthFromScroll()
      })
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      root.removeEventListener('scroll', onScroll)
      if (scrollRaf.current != null) window.cancelAnimationFrame(scrollRaf.current)
    }
  }, [updateVisibleMonthFromScroll, months.length])

  const { cursorClassName: monthScrollCursor } = useScrollPan(scrollRef, { axis: 'vertical' })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-10 shrink-0 border-b border-wf-border/60 bg-wf-bg/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wf-surface text-wf-accent shadow-[var(--shadow-card)] transition-transform active:scale-95"
            aria-label="Previous month"
          >
            <ChevronLeft size={20} strokeWidth={1.75} />
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <h2 className="truncate font-display text-title font-bold tracking-tight">
              {formatMonthYear(visibleMonth)}
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
            onClick={() => navigateMonth(1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wf-surface text-wf-accent shadow-[var(--shadow-card)] transition-transform active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-t border-wf-border/60 bg-wf-bg/60">
          {weekdayHeaders.map((label, i) => (
            <div
              key={i}
              className={`py-2 text-center text-caption font-semibold text-wf-text-secondary ${
                i < 6 ? 'border-r border-wf-border/80' : ''
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-6 pt-4 ${monthScrollCursor}`}
      >
        <div ref={topSentinelRef} className="h-px shrink-0" aria-hidden />

        {months.map((monthDate) => {
          const year = monthDate.getFullYear()
          const month = monthDate.getMonth()
          return (
            <section
              key={monthKey(monthDate)}
              ref={(node) => registerMonthSection(monthDate, node)}
              data-month-key={monthKey(monthDate)}
              className="mb-6 scroll-mt-2 last:mb-4"
            >
              <MonthGrid
                year={year}
                month={month}
                items={items}
                selectedDay={selectedDay}
                multiDayLayout={multiDayLayout}
                todayHighlight={todayHighlight}
                weekStartsOn={weekStartsOn}
                expandWeekRows={expandWeekRows}
                onDaySelect={onDaySelect}
                onDayAdd={onDayAdd}
                onItemTap={onItemTap}
              />
            </section>
          )
        })}

        <div ref={bottomSentinelRef} className="h-px shrink-0" aria-hidden />
      </div>
    </div>
  )
}

function MonthGrid({
  year,
  month,
  items,
  selectedDay,
  multiDayLayout,
  todayHighlight,
  weekStartsOn,
  expandWeekRows,
  onDaySelect,
  onDayAdd,
  onItemTap,
}: {
  year: number
  month: number
  items: CalendarItem[]
  selectedDay?: Date
  multiDayLayout: 'span-bar' | 'repeat-daily'
  todayHighlight: TodayHighlightOptions
  weekStartsOn: WeekStartsOn
  expandWeekRows: boolean
  onDaySelect: (date: Date) => void
  onDayAdd?: (date: Date) => void
  onItemTap?: (item: CalendarItem) => void
}) {
  const weeks = getMonthGridFilled(year, month, weekStartsOn)

  return (
    <div className="overflow-hidden rounded-2xl border border-wf-border bg-wf-surface shadow-[var(--shadow-card)]">
      {weeks.map((weekDays, weekIndex) => (
        <MonthWeekRow
          key={weekIndex}
          weekDays={weekDays}
          month={month}
          items={items}
          selectedDay={selectedDay}
          multiDayLayout={multiDayLayout}
          todayHighlight={todayHighlight}
          weekStartsOn={weekStartsOn}
          expandWeekRows={expandWeekRows}
          onDaySelect={onDaySelect}
          onDayAdd={onDayAdd}
          onItemTap={onItemTap}
        />
      ))}
    </div>
  )
}

function MonthWeekRow({
  weekDays,
  month,
  items,
  selectedDay,
  multiDayLayout,
  todayHighlight,
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
  todayHighlight: TodayHighlightOptions
  weekStartsOn: WeekStartsOn
  expandWeekRows: boolean
  onDaySelect: (date: Date) => void
  onDayAdd?: (date: Date) => void
  onItemTap?: (item: CalendarItem) => void
}) {
  const weekStart = startOfWeek(weekDays[0], weekStartsOn)
  const spanSegments =
    multiDayLayout === 'span-bar' ? getWeekSpanSegments(items, weekStart) : []
  const laneCount = spanSegments.length
  const eventsRow = 2 + laneCount

  const dayEntries = weekDays.map((day) =>
    getDayItemEntriesForColumn(items, day, multiDayLayout),
  )
  const maxSingleDayEvents = Math.max(0, ...dayEntries.map((entries) => entries.length))
  const rowMinHeight = weekRowMinHeight(laneCount, maxSingleDayEvents, expandWeekRows)

  return (
    <div
      className="grid grid-cols-7 border-b border-wf-border last:border-b-0"
      style={rowMinHeight != null ? { minHeight: rowMinHeight } : undefined}
    >
      {weekDays.map((day, colIndex) => {
        const inMonth = day.getMonth() === month
        const selected = selectedDay ? isSameDay(day, selectedDay) : false
        return (
          <MonthDateHeader
            key={`date-${toISODate(day)}`}
            day={day}
            colIndex={colIndex}
            inMonth={inMonth}
            selected={selected}
            todayHighlight={todayHighlight}
            style={{ gridRow: 1, gridColumn: colIndex + 1 }}
            onDaySelect={onDaySelect}
            onDayAdd={onDayAdd}
          />
        )
      })}

      {spanSegments.map((segment, laneIndex) => {
        const row = laneIndex + 2
        return (
          <div key={`span-lane-${segment.item.id}-${laneIndex}`} className="contents">
            {weekDays.map((day, colIndex) => (
              <div
                key={`span-bg-${toISODate(day)}-${laneIndex}`}
                className={`${monthCellBorderClass(
                  colIndex,
                  day.getMonth() === month,
                  'min-h-[19px]',
                )}`}
                style={{ gridRow: row, gridColumn: colIndex + 1 }}
                aria-hidden
              />
            ))}
            <div
              className="pointer-events-none z-[1] px-0.5 py-0.5"
              style={{
                gridRow: row,
                gridColumn: `${segment.startCol + 1} / span ${segment.spanCols}`,
              }}
            >
              <MonthSpanChip
                segment={segment}
                viewDate={weekDays[segment.startCol]}
                onItemTap={onItemTap}
              />
            </div>
          </div>
        )
      })}

      {weekDays.map((day, colIndex) => {
        const inMonth = day.getMonth() === month
        const selected = selectedDay ? isSameDay(day, selectedDay) : false
        return (
          <MonthDayEventsCell
            key={`events-${toISODate(day)}`}
            day={day}
            colIndex={colIndex}
            inMonth={inMonth}
            entries={dayEntries[colIndex]}
            expandWeekRows={expandWeekRows}
            selected={selected}
            todayHighlight={todayHighlight}
            style={{ gridRow: eventsRow, gridColumn: colIndex + 1 }}
            onDaySelect={onDaySelect}
            onItemTap={onItemTap}
          />
        )
      })}
    </div>
  )
}

function MonthDateHeader({
  day,
  colIndex,
  inMonth,
  selected,
  todayHighlight,
  style,
  onDaySelect,
  onDayAdd,
}: {
  day: Date
  colIndex: number
  inMonth: boolean
  selected: boolean
  todayHighlight: TodayHighlightOptions
  style: CSSProperties
  onDaySelect: (date: Date) => void
  onDayAdd?: (date: Date) => void
}) {
  const today = isToday(day)
  const dayMenu = useDayContextMenu(day)
  const cellHighlight = mergeHighlightStyle(
    resolveTodayHighlight(today, todayHighlight, 'month-cell'),
    resolveTodayHighlight(today, todayHighlight, 'month-date-button'),
  )

  const dateButtonClass = today
    ? resolveTodayDateClass(true, todayHighlight, 'xs')
    : inMonth
      ? 'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-caption font-semibold text-wf-text hover:bg-black/[0.06]'
      : 'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-caption font-semibold text-wf-text-tertiary hover:bg-black/[0.04]'

  return (
    <div
      style={{ ...style, ...cellHighlight.style }}
      {...dayMenu}
      className={`group ${monthCellBorderClass(colIndex, inMonth, selected ? 'ring-1 ring-inset ring-wf-accent/35' : '')} ${cellHighlight.className}`}
    >
      <div className="flex items-start justify-between gap-1">
        <button
          type="button"
          onClick={() => onDaySelect(day)}
          className={dateButtonClass}
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
    </div>
  )
}

function MonthDayEventsCell({
  day,
  colIndex,
  inMonth,
  entries,
  expandWeekRows,
  selected,
  todayHighlight,
  style,
  onDaySelect,
  onItemTap,
}: {
  day: Date
  colIndex: number
  inMonth: boolean
  entries: DayItemEntry[]
  expandWeekRows: boolean
  selected: boolean
  todayHighlight: TodayHighlightOptions
  style: CSSProperties
  onDaySelect: (date: Date) => void
  onItemTap?: (item: CalendarItem) => void
}) {
  const eventLimit = expandWeekRows ? entries.length : MAX_VISIBLE_EVENTS
  const visibleEntries = entries.slice(0, eventLimit)
  const overflowCount = expandWeekRows ? 0 : entries.length - visibleEntries.length
  const dayMenu = useDayContextMenu(day)
  const today = isToday(day)
  const cellHighlight = mergeHighlightStyle(resolveTodayHighlight(today, todayHighlight, 'month-cell'))

  return (
    <div
      style={{ ...style, ...cellHighlight.style }}
      {...dayMenu}
      className={`${monthCellBorderClass(
        colIndex,
        inMonth,
        `${selected ? 'ring-1 ring-inset ring-wf-accent/35' : ''} ${expandWeekRows ? '' : 'min-h-[4.5rem]'}`,
      )} ${cellHighlight.className}`}
    >
      <div className="space-y-0.5">
        {visibleEntries.map((entry) => (
          <MonthEventChip
            key={`${entry.item.id}-${entry.spanPosition}`}
            entry={entry}
            viewDate={day}
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

function MonthSpanChip({
  segment,
  viewDate,
  onItemTap,
}: {
  segment: WeekSpanSegment
  viewDate: Date
  onItemTap?: (item: CalendarItem) => void
}) {
  const { item, continuesBefore, continuesAfter } = segment
  const itemMenu = useItemContextMenu(item, viewDate)
  const radius = 3
  const borderRadius = `${continuesBefore ? 0 : radius}px ${continuesAfter ? 0 : radius}px ${continuesAfter ? 0 : radius}px ${continuesBefore ? 0 : radius}px`

  return (
    <button
      type="button"
      onClick={() => onItemTap?.(item)}
      {...itemMenu}
      className="pointer-events-auto flex h-full w-full min-w-0 items-center overflow-hidden px-1 py-0.5 text-left text-[10px] leading-tight transition-opacity hover:opacity-90 active:scale-[0.99]"
      style={{
        backgroundColor: `${item.colour}28`,
        borderLeft: continuesBefore ? undefined : `2px solid ${item.colour}`,
        borderRadius,
      }}
      title={item.title}
    >
      <span className="truncate font-medium text-wf-text">
        {continuesBefore && <span className="mr-0.5 opacity-60">←</span>}
        {item.title}
        {continuesAfter && <span className="ml-0.5 opacity-60">→</span>}
      </span>
    </button>
  )
}

function MonthEventChip({
  entry,
  viewDate,
  onItemTap,
}: {
  entry: DayItemEntry
  viewDate: Date
  onItemTap?: (item: CalendarItem) => void
}) {
  const { item } = entry
  const itemMenu = useItemContextMenu(item, viewDate)
  const timePrefix =
    !item.allDay && item.startTime ? `${formatTime(item.startTime)} ` : ''

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onItemTap?.(item)
      }}
      {...itemMenu}
      className="flex w-full min-w-0 items-start overflow-hidden rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-opacity hover:opacity-90 active:scale-[0.99]"
      style={{
        backgroundColor: `${item.colour}28`,
        borderLeft: `2px solid ${item.colour}`,
      }}
      title={`${timePrefix}${item.title}`}
    >
      <span className="min-w-0 break-words font-medium text-wf-text">
        {timePrefix && (
          <span className="font-semibold tabular-nums text-wf-text-secondary">{timePrefix}</span>
        )}
        {item.title}
      </span>
    </button>
  )
}

export { toISODate }
