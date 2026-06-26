import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions, TodayHighlightOptions } from '../types'
import { DEFAULT_TODAY_HIGHLIGHT } from '../types'
import { formatDayHeader, getDayItemEntries, isToday } from '../dateUtils'
import {
  resolveTodayHighlight,
  resolveTodayTitlePresentation,
} from '../lib/todayHighlight'
import { GroupedItemList } from './GroupedItemList'
import { TodayHighlightBadge } from './TodayHighlightBadge'
import { ListOptionsMenu } from './ui/ListOptionsMenu'
import { SectionHeader } from './ui/SectionHeader'
import { useDayContextMenu } from '../hooks/useCalendarContextMenu'

interface TodayViewProps {
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  onListOptionsChange: (options: ListDisplayOptions) => void
  date?: Date
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function TodayView({
  items,
  categories,
  listOptions,
  displayOptions,
  todayHighlight = DEFAULT_TODAY_HIGHLIGHT,
  onListOptionsChange,
  date = new Date(),
  onItemTap,
  onToggleComplete,
}: TodayViewProps) {
  const entries = getDayItemEntries(items, date)
  const dayMenu = useDayContextMenu(date)
  const today = isToday(date)
  const cardHighlight = resolveTodayHighlight(today, todayHighlight, 'day-card')
  const headerHighlight = resolveTodayHighlight(today, todayHighlight, 'day-card-header')
  const onSolid = todayHighlight.backgroundMode === 'solid' && today
  const title = resolveTodayTitlePresentation(today, todayHighlight, onSolid)

  return (
    <div className="px-4 pb-6 pt-2 safe-top">
      <div className="mb-4 flex items-start justify-between gap-2">
        <SectionHeader
          subtitle={today ? 'Today' : 'Focus'}
          title={formatDayHeader(date)}
        />
        <ListOptionsMenu
          categories={categories}
          options={listOptions}
          onChange={onListOptionsChange}
        />
      </div>

      <section
        {...dayMenu}
        className="relative overflow-hidden rounded-[var(--radius-lg)] bg-wf-surface shadow-[var(--shadow-card)]"
        style={cardHighlight.style}
      >
        {today && (
          <div
            className={`flex items-center justify-between border-b border-wf-border px-4 py-2 ${headerHighlight.className}`}
            style={headerHighlight.style}
          >
            <span className={title.className} style={title.style}>Today</span>
            <TodayHighlightBadge isToday options={todayHighlight} />
          </div>
        )}
        <div className="px-2 py-2">
          <GroupedItemList
            entries={entries}
            viewDate={date}
            categories={categories}
            listOptions={listOptions}
            displayOptions={displayOptions}
            emptyMessage="Nothing on today"
            onItemTap={onItemTap}
            onToggleComplete={onToggleComplete}
          />
        </div>
      </section>
    </div>
  )
}
