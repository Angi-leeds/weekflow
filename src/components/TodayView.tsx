import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions } from '../types'
import { formatDayHeader, getDayItemEntries, isToday } from '../dateUtils'
import { GroupedItemList } from './GroupedItemList'
import { ListOptionsMenu } from './ui/ListOptionsMenu'
import { SectionHeader } from './ui/SectionHeader'

interface TodayViewProps {
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
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
  onListOptionsChange,
  date = new Date(),
  onItemTap,
  onToggleComplete,
}: TodayViewProps) {
  const entries = getDayItemEntries(items, date)

  return (
    <div className="px-4 pb-6 pt-2 safe-top">
      <div className="mb-4 flex items-start justify-between gap-2">
        <SectionHeader
          subtitle={isToday(date) ? 'Today' : 'Focus'}
          title={formatDayHeader(date)}
        />
        <ListOptionsMenu
          categories={categories}
          options={listOptions}
          onChange={onListOptionsChange}
        />
      </div>

      <section className="overflow-hidden rounded-[var(--radius-lg)] bg-wf-surface shadow-[var(--shadow-card)]">
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
