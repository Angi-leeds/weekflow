import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions } from '../types'
import { formatDayHeader, getAgendaEntries, parseDate } from '../dateUtils'
import { GroupedItemList } from './GroupedItemList'
import { SectionHeader } from './ui/SectionHeader'

interface AgendaViewProps {
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function AgendaView({ items, categories, listOptions, displayOptions, onItemTap, onToggleComplete }: AgendaViewProps) {
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
          <section
            key={date}
            className="overflow-hidden rounded-[var(--radius-lg)] bg-wf-surface shadow-[var(--shadow-card)]"
          >
            <h3 className="border-b border-wf-border px-4 py-2.5 font-display text-body font-semibold">
              {formatDayHeader(parseDate(date))}
            </h3>
            <div className="px-2 py-2">
              <GroupedItemList
                entries={dayEntries}
                viewDate={parseDate(date)}
                categories={categories}
                listOptions={listOptions}
                displayOptions={displayOptions}
                onItemTap={onItemTap}
                onToggleComplete={onToggleComplete}
              />
            </div>
          </section>
        ))
      )}
    </div>
  )
}
