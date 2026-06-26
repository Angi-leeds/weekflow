import type { CalendarItem, Category, DateHeaderDisplayOptions, ItemDisplayOptions, ListDisplayOptions, TodayHighlightOptions, WeekStartsOn } from '../types'
import { DEFAULT_DATE_HEADER_DISPLAY, DEFAULT_TODAY_HIGHLIGHT } from '../types'
import { formatDayHeader } from '../dateUtils'
import { DayHeaderMetaLabels } from './DayHeaderMetaLabels'
import { DayCardFromDate } from './DayCard'
import { ViewDateHeaderExtras } from './ViewDateTitle'
import { SectionHeader } from './ui/SectionHeader'

interface DayViewProps {
  date: Date
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  dateHeaderDisplay?: DateHeaderDisplayOptions
  weekStartsOn?: WeekStartsOn
  onJumpToDate?: (date: Date) => void
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function DayView({
  date,
  items,
  categories,
  listOptions,
  displayOptions,
  todayHighlight = DEFAULT_TODAY_HIGHLIGHT,
  dateHeaderDisplay = DEFAULT_DATE_HEADER_DISPLAY,
  weekStartsOn,
  onJumpToDate,
  onItemTap,
  onToggleComplete,
}: DayViewProps) {
  return (
    <div className="px-4 pb-6 pt-1">
      <SectionHeader
        subtitle="Day view"
        title={formatDayHeader(date)}
        titleExtra={
          <>
            <DayHeaderMetaLabels date={date} display={dateHeaderDisplay} />
            <ViewDateHeaderExtras
              referenceDate={date}
              onJumpToDate={onJumpToDate}
              weekStartsOn={weekStartsOn}
            />
          </>
        }
      />
      <DayCardFromDate
        date={date}
        allItems={items}
        categories={categories}
        listOptions={listOptions}
        displayOptions={displayOptions}
        todayHighlight={todayHighlight}
        dateHeaderDisplay={dateHeaderDisplay}
        onItemTap={onItemTap}
        onToggleComplete={onToggleComplete}
      />
    </div>
  )
}