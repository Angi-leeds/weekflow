import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions, MultiDayAllDayLayout, TodayHighlightOptions } from '../types'
import { DEFAULT_TODAY_HIGHLIGHT } from '../types'
import {
  formatDayColumnHeader,
  formatDayNumber,
  formatTime,
  getDayItemEntriesForColumn,
  getItemsForDate,
  isToday,
  toISODate,
} from '../dateUtils'
import {
  mergeHighlightStyle,
  resolveTodayDateClass,
  resolveTodayHighlight,
  resolveTodayWeekdayClass,
} from '../lib/todayHighlight'
import { DayCardFromDate } from './DayCard'
import { GroupedItemList } from './GroupedItemList'
import { TodayHighlightBadge } from './TodayHighlightBadge'
import { useDayContextMenu, useItemContextMenu } from '../hooks/useCalendarContextMenu'

const TIMELINE_HOURS = Array.from({ length: 14 }, (_, i) => i + 7)

export type WeekRollingDayMode = 'board' | 'list' | 'timeline'

interface WeekRollingDayColumnProps {
  date: Date
  dayWidth: number
  mode: WeekRollingDayMode
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  multiDayLayout: MultiDayAllDayLayout
  showRightBorder?: boolean
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function WeekRollingDayColumn({
  date,
  dayWidth,
  mode,
  items,
  categories,
  listOptions,
  displayOptions,
  todayHighlight = DEFAULT_TODAY_HIGHLIGHT,
  multiDayLayout,
  showRightBorder = true,
  onItemTap,
  onToggleComplete,
}: WeekRollingDayColumnProps) {
  const today = isToday(date)
  const dayMenu = useDayContextMenu(date)

  if (mode === 'list') {
    return (
      <div
        data-wheel-chain
        {...dayMenu}
        className={`box-border h-full shrink-0 overflow-x-hidden overflow-y-auto ${
          showRightBorder ? 'border-r border-wf-border' : ''
        }`}
        style={{ width: dayWidth }}
      >
        <DayCardFromDate
          date={date}
          allItems={items}
          categories={categories}
          listOptions={listOptions}
          displayOptions={displayOptions}
          todayHighlight={todayHighlight}
          excludeMultiDayAllDay={multiDayLayout === 'span-bar'}
          compact
          dense
          onItemTap={onItemTap}
          onToggleComplete={onToggleComplete}
        />
      </div>
    )
  }

  if (mode === 'timeline') {
    const headerHighlight = mergeHighlightStyle(
      resolveTodayHighlight(today, todayHighlight, 'column-header'),
    )
    const columnHighlight = mergeHighlightStyle(
      resolveTodayHighlight(today, todayHighlight, 'column-root'),
    )

    return (
      <div
        data-wheel-chain
        {...dayMenu}
        className={`box-border flex h-full shrink-0 flex-col overflow-hidden ${
          showRightBorder ? 'border-r border-wf-border/80' : ''
        } ${columnHighlight.className}`}
        style={{ width: dayWidth, ...columnHighlight.style }}
      >
        <div
          className={`relative shrink-0 border-b border-wf-border px-1 py-2 text-center ${headerHighlight.className}`}
          style={headerHighlight.style}
        >
          <p className={resolveTodayWeekdayClass(today, todayHighlight, 'xs')}>
            {formatDayColumnHeader(date)}
          </p>
          <p className={resolveTodayDateClass(today, todayHighlight, 'sm')}>
            {formatDayNumber(date)}
          </p>
          {todayHighlight.badge === 'corner' && (
            <TodayHighlightBadge isToday={today} options={todayHighlight} />
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {TIMELINE_HOURS.map((hour) => {
            const hourItems = getItemsForDate(items, date).filter((item) => {
              if (item.allDay || !item.startTime) return false
              return parseInt(item.startTime.split(':')[0], 10) === hour
            })
            const label = `${hour % 12 || 12}${hour >= 12 ? 'pm' : 'am'}`

            return (
              <div key={hour} className="flex min-h-[48px] border-b border-wf-border/40">
                <div className="w-7 shrink-0 pt-1 text-right text-[9px] text-wf-text-tertiary">{label}</div>
                <div className="min-w-0 flex-1 p-0.5">
                  {hourItems.map((item) => (
                    <TimelineEventChip key={item.id} item={item} viewDate={date} onItemTap={onItemTap} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const entries = getDayItemEntriesForColumn(items, date, multiDayLayout)
  const headerHighlight = mergeHighlightStyle(resolveTodayHighlight(today, todayHighlight, 'column-header'))
  const columnHighlight = mergeHighlightStyle(resolveTodayHighlight(today, todayHighlight, 'column-root'))

  return (
    <div
      data-wheel-chain
      {...dayMenu}
      className={`box-border flex h-full shrink-0 flex-col overflow-hidden ${
        showRightBorder ? 'border-r border-wf-border' : ''
      } ${today ? columnHighlight.className : 'bg-wf-surface'}`}
      style={{ width: dayWidth, ...(today ? columnHighlight.style : undefined) }}
    >
      <header
        className={`relative shrink-0 border-b border-wf-border px-0.5 py-2.5 text-center ${
          today ? headerHighlight.className : 'bg-wf-surface'
        }`}
        style={today ? headerHighlight.style : undefined}
      >
        <p className={resolveTodayWeekdayClass(today, todayHighlight, 'md')}>
          {formatDayColumnHeader(date)}
        </p>
        <p className={resolveTodayDateClass(today, todayHighlight, 'md')}>
          {formatDayNumber(date)}
        </p>
        {todayHighlight.badge === 'corner' && (
          <TodayHighlightBadge isToday={today} options={todayHighlight} />
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-0.5">
        <GroupedItemList
          entries={entries}
          viewDate={date}
          categories={categories}
          listOptions={listOptions}
          displayOptions={displayOptions}
          compact
          dense
          emptyMessage="—"
          onItemTap={onItemTap}
          onToggleComplete={onToggleComplete}
        />
      </div>
    </div>
  )
}

export function listRollingDays(from: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const d = new Date(from)
    d.setDate(d.getDate() + index)
    return d
  })
}

export function rollingDayKey(date: Date): string {
  return toISODate(date)
}

function TimelineEventChip({
  item,
  viewDate,
  onItemTap,
}: {
  item: CalendarItem
  viewDate: Date
  onItemTap?: (item: CalendarItem) => void
}) {
  const itemMenu = useItemContextMenu(item, viewDate)

  return (
    <div
      className="mb-0.5 rounded-md px-1 py-0.5 text-[10px] font-medium text-white"
      style={{ backgroundColor: item.colour }}
    >
      <button
        type="button"
        className="w-full truncate text-left"
        onClick={() => onItemTap?.(item)}
        {...itemMenu}
      >
        {formatTime(item.startTime!)} {item.title}
      </button>
    </div>
  )
}
