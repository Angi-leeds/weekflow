import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions, TodayHighlightOptions } from '../types'
import { DEFAULT_TODAY_HIGHLIGHT } from '../types'
import { formatDayHeader } from '../dateUtils'
import { DayCardFromDate } from './DayCard'
import { SectionHeader } from './ui/SectionHeader'

interface DayViewProps {
  date: Date
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function DayView({ date, items, categories, listOptions, displayOptions, todayHighlight = DEFAULT_TODAY_HIGHLIGHT, onItemTap, onToggleComplete }: DayViewProps) {
  return (
    <div className="px-4 pb-6 pt-1">
      <SectionHeader subtitle="Day view" title={formatDayHeader(date)} />
      <DayCardFromDate
        date={date}
        allItems={items}
        categories={categories}
        listOptions={listOptions}
        displayOptions={displayOptions}
        todayHighlight={todayHighlight}
        onItemTap={onItemTap}
        onToggleComplete={onToggleComplete}
      />
    </div>
  )
}
