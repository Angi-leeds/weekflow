import type { CalendarItem, Category, DateHeaderDisplayOptions, ItemDisplayOptions, ListDisplayOptions, TodayHighlightOptions, WeekStartsOn } from '../types'
import { DEFAULT_DATE_HEADER_DISPLAY, DEFAULT_TODAY_HIGHLIGHT } from '../types'
import { getAgendaEntries, isSameDay, parseDate } from '../dateUtils'
import { DayCard } from './DayCard'
import { ViewDateHeaderExtras } from './ViewDateTitle'
import { SectionHeader } from './ui/SectionHeader'

interface AgendaViewProps {
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  todayHighlight?: TodayHighlightOptions
  dateHeaderDisplay?: DateHeaderDisplayOptions
  weekStartsOn?: WeekStartsOn
  referenceDate: Date
  onJumpToDate?: (date: Date) => void
  onSelectDate?: (date: Date) => void
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function AgendaView({
  items,
  categories,
  listOptions,
  displayOptions,
  todayHighlight = DEFAULT_TODAY_HIGHLIGHT,
  dateHeaderDisplay = DEFAULT_DATE_HEADER_DISPLAY,
  weekStartsOn,
  referenceDate,
  onJumpToDate,
  onSelectDate,
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
      <SectionHeader
        title="Agenda"
        subtitle={`${groups.length} days`}
        titleExtra={
          <ViewDateHeaderExtras
            referenceDate={referenceDate}
            onJumpToDate={onJumpToDate}
            weekStartsOn={weekStartsOn}
          />
        }
      />

      {groups.length === 0 ? (
        <p className="py-8 text-center text-subhead text-wf-text-tertiary">No upcoming items</p>
      ) : (
        groups.map(([date, dayEntries]) => {
          const day = parseDate(date)
          const selected = isSameDay(day, referenceDate)
          return (
          <DayCard
            key={date}
            date={day}
            entries={dayEntries}
            categories={categories}
            listOptions={listOptions}
            displayOptions={displayOptions}
            todayHighlight={todayHighlight}
            dateHeaderDisplay={dateHeaderDisplay}
            selected={selected}
            onSelectDate={onSelectDate}
            onItemTap={onItemTap}
            onToggleComplete={onToggleComplete}
          />
        )})
      )}
    </div>
  )
}
