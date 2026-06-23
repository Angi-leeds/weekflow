import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarFilter, CalendarViewMode, Category, EmailAccount, ListDisplayOptions } from '../types'
import { formatMonthYear, formatWeekRange, isToday } from '../dateUtils'
import { IconButton } from './ui/IconButton'
import { ListOptionsMenu } from './ui/ListOptionsMenu'
import { SegmentedControl } from './ui/SegmentedControl'
import { getPrimaryTab, ViewsMenu, type PrimaryCalendarTab } from './ui/ViewsMenu'
import { CalendarAccountFilter } from './CalendarAccountFilter'

interface CalendarNavProps {
  weekStart: Date
  displayDate: Date
  viewMode: CalendarViewMode
  selectedDay: Date
  categories: Category[]
  listOptions: ListDisplayOptions
  calendarFilter: CalendarFilter
  calendarAccounts: EmailAccount[]
  onCalendarFilterChange: (filter: CalendarFilter) => void
  onListOptionsChange: (options: ListDisplayOptions) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onViewChange: (mode: CalendarViewMode) => void
  onPrimaryTabChange: (tab: PrimaryCalendarTab) => void
}

const PRIMARY_SEGMENTS: { id: PrimaryCalendarTab; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'today', label: 'Today' },
  { id: 'month', label: 'Month' },
]

export function CalendarNav({
  weekStart,
  displayDate,
  viewMode,
  selectedDay,
  categories,
  listOptions,
  calendarFilter,
  calendarAccounts,
  onCalendarFilterChange,
  onListOptionsChange,
  onPrevWeek,
  onNextWeek,
  onToday,
  onViewChange,
  onPrimaryTabChange,
}: CalendarNavProps) {
  const isWeekBased = ['week-list', 'week-board', 'week-timeline'].includes(viewMode)
  const primaryTab = getPrimaryTab(viewMode, isToday(selectedDay)) ?? 'week'

  const title = viewMode === 'month'
    ? formatMonthYear(displayDate)
    : isWeekBased
      ? formatWeekRange(weekStart)
      : viewMode === 'day'
        ? selectedDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'Calendar'

  return (
    <div className="sticky top-0 z-20 border-b border-wf-border bg-wf-bg/90 px-4 pb-3 pt-2 backdrop-blur-xl safe-top">
      {/* Top row: nav + title + today */}
      <div className="mb-3 flex items-center gap-2">
        {isWeekBased ? (
          <div className="flex items-center gap-1">
            <IconButton icon={ChevronLeft} label="Previous week" onClick={onPrevWeek} size="sm" />
            <IconButton icon={ChevronRight} label="Next week" onClick={onNextWeek} size="sm" />
          </div>
        ) : (
          <div className="w-[72px]" />
        )}

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-body font-bold tracking-tight text-wf-text">
            {title}
          </p>
        </div>

        <button
          type="button"
          onClick={onToday}
          className="shrink-0 rounded-full bg-wf-accent-soft px-3 py-1.5 text-subhead font-semibold text-wf-accent transition-transform active:scale-95"
        >
          Today
        </button>
      </div>

      {/* Segmented control + views menu */}
      <div className="flex items-center gap-2">
        <SegmentedControl
          segments={PRIMARY_SEGMENTS}
          active={primaryTab}
          onChange={onPrimaryTabChange}
          className="min-w-0 flex-1"
        />
        <ListOptionsMenu categories={categories} options={listOptions} onChange={onListOptionsChange} />
        <ViewsMenu viewMode={viewMode} onViewChange={onViewChange} />
      </div>

      {isWeekBased && (
        <CalendarAccountFilter
          filter={calendarFilter}
          accounts={calendarAccounts}
          onChange={onCalendarFilterChange}
        />
      )}
    </div>
  )
}
