import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions } from '../types'
import { formatDayHeader } from '../dateUtils'
import { DayCardFromDate } from './DayCard'
import { SectionHeader } from './ui/SectionHeader'

interface DayViewProps {
  date: Date
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function DayView({ date, items, categories, listOptions, displayOptions, onItemTap, onToggleComplete }: DayViewProps) {
  return (
    <div className="px-4 pb-6 pt-1">
      <SectionHeader subtitle="Day view" title={formatDayHeader(date)} />
      <DayCardFromDate
        date={date}
        allItems={items}
        categories={categories}
        listOptions={listOptions}
        displayOptions={displayOptions}
        onItemTap={onItemTap}
        onToggleComplete={onToggleComplete}
      />
    </div>
  )
}
