import type { DayItemEntry } from '../dateUtils'
import { formatDayHeader, getDayItemEntries, getDayItemEntriesForColumn, isToday, toISODate } from '../dateUtils'
import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions } from '../types'
import { GroupedItemList } from './GroupedItemList'

interface DayCardProps {
  date: Date
  entries: DayItemEntry[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function DayCard({ date, entries, categories, listOptions, displayOptions, onItemTap, onToggleComplete }: DayCardProps) {
  const today = isToday(date)

  return (
    <article
      className={`overflow-hidden rounded-[var(--radius-lg)] bg-wf-surface shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)] ${
        today ? 'ring-1 ring-wf-accent/25' : ''
      }`}
    >
      <header
        className={`flex items-center justify-between border-b border-wf-border px-4 py-3 ${
          today ? 'bg-wf-accent-soft/50' : ''
        }`}
      >
        <h3 className={`font-display text-body font-bold tracking-tight ${today ? 'text-wf-accent' : 'text-wf-text'}`}>
          {formatDayHeader(date)}
        </h3>
        {today && (
          <span className="rounded-full bg-wf-accent px-2.5 py-0.5 text-caption font-semibold text-white">
            Today
          </span>
        )}
      </header>

      <div className="px-2 py-2">
        <GroupedItemList
          entries={entries}
          viewDate={date}
          categories={categories}
          listOptions={listOptions}
          displayOptions={displayOptions}
          onItemTap={onItemTap}
          onToggleComplete={onToggleComplete}
        />
      </div>
    </article>
  )
}

interface DayCardFromDateProps {
  date: Date
  allItems: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  excludeMultiDayAllDay?: boolean
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function DayCardFromDate({
  date,
  allItems,
  categories,
  listOptions,
  displayOptions,
  excludeMultiDayAllDay,
  ...rest
}: DayCardFromDateProps) {
  const entries = excludeMultiDayAllDay
    ? getDayItemEntriesForColumn(allItems, date, 'span-bar')
    : getDayItemEntries(allItems, date)
  return <DayCard date={date} entries={entries} categories={categories} listOptions={listOptions} displayOptions={displayOptions} {...rest} />
}

export { toISODate }
