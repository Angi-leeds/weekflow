import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type {
  CalendarItem,
  CalendarViewMode,
  Category,
  DateHeaderDisplayOptions,
  ItemDisplayOptions,
  ListDisplayOptions,
  TodayHighlightOptions,
  WeekStartsOn,
  WeekViewAnchor,
} from '../types'
import { DEFAULT_ITEM_DISPLAY, DEFAULT_TODAY_HIGHLIGHT } from '../types'
import {
  addDays,
  daysBetween,
  formatVisibleDayRange,
  getDefaultWeekViewStart,
  getWeekSpanSegments,
  shouldShowMultiDaySpanBar,
  startOfWeek,
  toISODate,
} from '../dateUtils'
import { useHorizontalWheelChain, useScrollPan } from '../hooks/useScrollPan'
import { useIsLandscape } from '../hooks/useMediaQuery'
import { MultiDaySpanBar } from './MultiDaySpanBar'
import { CalendarViewHeader } from './CalendarViewHeader'
import {
  listRollingDays,
  WeekRollingDayColumn,
  type WeekRollingDayMode,
} from './WeekRollingDayColumn'

interface WeekViewProps {
  weekStartsOn: WeekStartsOn
  weekViewAnchor: WeekViewAnchor
  scrollToDate?: Date | null
  initialScrollDate?: Date
  referenceDate: Date
  selectedDate?: Date
  onSelectDate?: (date: Date) => void
  onJumpToDate?: (date: Date) => void
  onScrollToDateApplied?: () => void
  items: CalendarItem[]
  categories: Category[]
  viewMode: CalendarViewMode
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  dateHeaderDisplay?: DateHeaderDisplayOptions
  onWeekChange: (weekStart: Date) => void
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

const VISIBLE_DAYS = 7
const INITIAL_DAYS_BEFORE = 42
const INITIAL_DAYS_AFTER = 42
const LOAD_DAY_BATCH = 21

function normalizeDate(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function WeekView({
  weekStartsOn,
  weekViewAnchor,
  scrollToDate,
  initialScrollDate,
  referenceDate,
  selectedDate,
  onSelectDate,
  onJumpToDate,
  onScrollToDateApplied,
  items,
  categories,
  viewMode,
  listOptions,
  displayOptions = DEFAULT_ITEM_DISPLAY,
  todayHighlight = DEFAULT_TODAY_HIGHLIGHT,
  dateHeaderDisplay,
  onWeekChange,
  onItemTap,
  onToggleComplete,
}: WeekViewProps) {
  const isLandscape = useIsLandscape()
  const scrollRef = useRef<HTMLDivElement>(null)
  const leftSentinelRef = useRef<HTMLDivElement>(null)
  const rightSentinelRef = useRef<HTMLDivElement>(null)
  const scrollRaf = useRef<number | null>(null)
  const dayWidthRef = useRef(0)
  const lastReportedWeekKey = useRef('')
  const anchorPrefRef = useRef(`${weekViewAnchor}:${weekStartsOn}`)
  const hasInitialScroll = useRef(false)

  const initialStart = normalizeDate(
    initialScrollDate ?? getDefaultWeekViewStart(weekViewAnchor, weekStartsOn),
  )
  const [rangeStart, setRangeStart] = useState(() => addDays(initialStart, -INITIAL_DAYS_BEFORE))
  const rangeStartRef = useRef(rangeStart)
  rangeStartRef.current = rangeStart
  const [rangeDayCount, setRangeDayCount] = useState(INITIAL_DAYS_BEFORE + INITIAL_DAYS_AFTER + VISIBLE_DAYS)
  const [dayWidth, setDayWidth] = useState(0)
  const [visibleStart, setVisibleStart] = useState(initialStart)

  const days = listRollingDays(rangeStart, rangeDayCount)
  const visibleEnd = addDays(visibleStart, VISIBLE_DAYS - 1)
  const multiDayLayout = displayOptions.multiDayAllDayLayout ?? 'span-bar'

  const showBoard =
    viewMode === 'week-board' || (viewMode === 'week-list' && isLandscape)

  const dayMode: WeekRollingDayMode = viewMode === 'week-timeline'
    ? 'timeline'
    : showBoard
      ? 'board'
      : 'list'

  const spanSegments = useMemo(
    () => getWeekSpanSegments(items, visibleStart),
    [items, visibleStart],
  )
  const showSpanBar =
    dayMode !== 'timeline' && shouldShowMultiDaySpanBar(spanSegments, multiDayLayout)

  const updateDayWidth = useCallback(() => {
    const root = scrollRef.current
    if (!root) return
    const prevWidth = dayWidthRef.current
    const next = root.clientWidth / VISIBLE_DAYS
    if (next <= 0) return
    dayWidthRef.current = next
    setDayWidth(next)
    if (prevWidth > 0 && next !== prevWidth) {
      const index = root.scrollLeft / prevWidth
      root.scrollLeft = index * next
    }
  }, [])

  const scrollToDateInternal = useCallback((target: Date, behavior: ScrollBehavior = 'auto') => {
    const root = scrollRef.current
    const width = dayWidthRef.current
    if (!root || width <= 0) return

    const normalized = normalizeDate(target)
    const index = daysBetween(rangeStartRef.current, normalized)
    root.scrollTo({ left: index * width, behavior })
    setVisibleStart((prev) => (toISODate(prev) === toISODate(normalized) ? prev : normalized))
  }, [])

  const applyInitialScrollPosition = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const target = initialScrollDate
        ? normalizeDate(initialScrollDate)
        : normalizeDate(getDefaultWeekViewStart(weekViewAnchor, weekStartsOn))
      scrollToDateInternal(target, behavior)
    },
    [initialScrollDate, scrollToDateInternal, weekViewAnchor, weekStartsOn],
  )

  const prependDays = useCallback((count: number) => {
    const root = scrollRef.current
    if (!root) return
    const width = dayWidthRef.current
    const prevScrollWidth = root.scrollWidth
    setRangeStart((prev) => addDays(prev, -count))
    setRangeDayCount((prev) => prev + count)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!scrollRef.current || width <= 0) return
        scrollRef.current.scrollLeft += scrollRef.current.scrollWidth - prevScrollWidth
      })
    })
  }, [])

  const appendDays = useCallback((count: number) => {
    setRangeDayCount((prev) => prev + count)
  }, [])

  const updateVisibleStartFromScroll = useCallback(() => {
    const root = scrollRef.current
    const width = dayWidthRef.current
    if (!root || width <= 0) return

    const index = Math.max(0, Math.floor(root.scrollLeft / width))
    const next = addDays(rangeStart, index)
    setVisibleStart((prev) => (toISODate(prev) === toISODate(next) ? prev : next))
  }, [rangeStart])

  const navigateByDays = useCallback(
    (deltaDays: number) => {
      scrollToDateInternal(addDays(visibleStart, deltaDays), 'smooth')
    },
    [scrollToDateInternal, visibleStart],
  )

  useLayoutEffect(() => {
    updateDayWidth()
    const root = scrollRef.current
    if (!root) return

    const observer = new ResizeObserver(() => updateDayWidth())
    observer.observe(root)
    return () => observer.disconnect()
  }, [updateDayWidth])

  useLayoutEffect(() => {
    if (dayWidth <= 0 || hasInitialScroll.current) return
    hasInitialScroll.current = true
    applyInitialScrollPosition('auto')
  }, [dayWidth, applyInitialScrollPosition])

  useEffect(() => {
    const prefKey = `${weekViewAnchor}:${weekStartsOn}`
    if (prefKey === anchorPrefRef.current) return
    anchorPrefRef.current = prefKey

    const start = initialScrollDate
      ? normalizeDate(initialScrollDate)
      : normalizeDate(getDefaultWeekViewStart(weekViewAnchor, weekStartsOn))
    setRangeStart(addDays(start, -INITIAL_DAYS_BEFORE))
    setRangeDayCount(INITIAL_DAYS_BEFORE + INITIAL_DAYS_AFTER + VISIBLE_DAYS)
    if (dayWidth > 0) {
      requestAnimationFrame(() => applyInitialScrollPosition('auto'))
    } else {
      hasInitialScroll.current = false
    }
  }, [weekViewAnchor, weekStartsOn, dayWidth, applyInitialScrollPosition, initialScrollDate])

  useEffect(() => {
    if (!scrollToDate || dayWidth <= 0) return
    scrollToDateInternal(normalizeDate(scrollToDate), 'smooth')
    onScrollToDateApplied?.()
  }, [scrollToDate, dayWidth, scrollToDateInternal, onScrollToDateApplied])

  useEffect(() => {
    const weekKey = toISODate(startOfWeek(visibleStart, weekStartsOn))
    if (weekKey === lastReportedWeekKey.current) return
    lastReportedWeekKey.current = weekKey
    onWeekChange(startOfWeek(visibleStart, weekStartsOn))
  }, [visibleStart, weekStartsOn, onWeekChange])

  useEffect(() => {
    const root = scrollRef.current
    const left = leftSentinelRef.current
    const right = rightSentinelRef.current
    if (!root || !left || !right) return

    const leftObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) prependDays(LOAD_DAY_BATCH)
      },
      { root, rootMargin: '0px 0px 0px 160px', threshold: 0 },
    )
    const rightObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) appendDays(LOAD_DAY_BATCH)
      },
      { root, rootMargin: '0px 160px 0px 0px', threshold: 0 },
    )

    leftObserver.observe(left)
    rightObserver.observe(right)
    return () => {
      leftObserver.disconnect()
      rightObserver.disconnect()
    }
  }, [appendDays, prependDays, rangeStart, rangeDayCount])

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const onScroll = () => {
      if (scrollRaf.current != null) return
      scrollRaf.current = window.requestAnimationFrame(() => {
        scrollRaf.current = null
        updateVisibleStartFromScroll()
      })
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      root.removeEventListener('scroll', onScroll)
      if (scrollRaf.current != null) window.cancelAnimationFrame(scrollRaf.current)
    }
  }, [updateVisibleStartFromScroll, days.length])

  const { cursorClassName: weekScrollCursor } = useScrollPan(scrollRef, { axis: 'horizontal' })
  useHorizontalWheelChain(scrollRef, '[data-wheel-chain]', [days.length, dayWidth])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-10 shrink-0 border-b border-wf-border/60 bg-wf-bg/95 px-4 py-2 backdrop-blur-sm">
        <CalendarViewHeader
          title={formatVisibleDayRange(visibleStart, visibleEnd)}
          referenceDate={referenceDate}
          onJumpToDate={onJumpToDate}
          weekStartsOn={weekStartsOn}
          onPrevious={() => navigateByDays(-VISIBLE_DAYS)}
          onNext={() => navigateByDays(VISIBLE_DAYS)}
          previousAriaLabel="Previous week"
          nextAriaLabel="Next week"
        />
      </div>

      {showSpanBar && (
        <div className="shrink-0 border-b border-wf-border bg-wf-surface px-1 py-0.5">
          <MultiDaySpanBar
            segments={spanSegments}
            weekStart={visibleStart}
            onItemTap={onItemTap}
            showDayLabels={false}
            seamless
            compact
          />
        </div>
      )}

      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain ${weekScrollCursor}`}
      >
        <div
          className="flex h-full min-h-0"
          style={dayWidth > 0 ? { width: days.length * dayWidth } : undefined}
        >
          <div ref={leftSentinelRef} className="w-px shrink-0" aria-hidden />

          {dayWidth > 0 &&
            days.map((day, index) => (
              <WeekRollingDayColumn
                key={toISODate(day)}
                date={day}
                dayWidth={dayWidth}
                mode={dayMode}
                items={items}
                categories={categories}
                listOptions={listOptions}
                displayOptions={displayOptions}
                todayHighlight={todayHighlight}
                dateHeaderDisplay={dateHeaderDisplay}
                selectedDate={selectedDate}
                onSelectDate={onSelectDate}
                multiDayLayout={multiDayLayout}
                showRightBorder={index < days.length - 1}
                onItemTap={onItemTap}
                onToggleComplete={onToggleComplete}
              />
            ))}

          <div ref={rightSentinelRef} className="w-px shrink-0" aria-hidden />
        </div>
      </div>
    </div>
  )
}
