import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions, TodayHighlightOptions } from '../types'
import { DEFAULT_TODAY_HIGHLIGHT } from '../types'
import { getAgendaEntries, parseDate } from '../dateUtils'
import { DayCard } from './DayCard'
import { SectionHeader } from './ui/SectionHeader'

interface AgendaViewProps {
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function AgendaView({
  items,
  categories,
  listOptions,
  displayOptions,
  todayHighlight = DEFAULT_TODAY_HIGHLIGHT,
  onItemTap,
  onToggleComplete,
}: AgendaViewProps) {
  const entries = getAgendaEntries(items)

  const grouped = entries.reduce<Map<string, typeof entries>>((map, entry) => {
    const key = entry.item.date
    const list = map.get(key) ?? []
    list.push(entry)
    map.set(key, list)
    return map
  }, new Map())

  const groups = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-3 px-4 pb-6 pt-2">
      <SectionHeader title="Agenda" subtitle={`${groups.length} days`} />

      {groups.length === 0 ? (
        <p className="py-8 text-center text-subhead text-wf-text-tertiary">No upcoming items</p>
      ) : (
        groups.map(([date, dayEntries]) => (
          <DayCard
            key={date}
            date={parseDate(date)}
            entries={dayEntries}
            categories={categories}
            listOptions={listOptions}
            displayOptions={displayOptions}
            todayHighlight={todayHighlight}
            onItemTap={onItemTap}
            onToggleComplete={onToggleComplete}
          />
        ))
      )}
    </div>
  )
}
