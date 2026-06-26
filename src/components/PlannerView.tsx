import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions } from '../types'
import type { DayItemEntry } from '../dateUtils'
import { parseDate } from '../dateUtils'
import { CheckSquare } from 'lucide-react'
import { TODO_SECTION_LABEL } from '../branding'
import { CalendarItemRow } from './CalendarItem'
import { GroupedItemList } from './GroupedItemList'
import { isTaskOrReminder } from './itemHelpers'
import { plannerSubtitle } from '../lib/providerTasks'
import { ListOptionsMenu } from './ui/ListOptionsMenu'
import { SectionHeader } from './ui/SectionHeader'

interface PlannerViewProps {
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  /** Connected provider name(s), e.g. "Microsoft To Do". */
  taskListLabel?: string
  onListOptionsChange: (options: ListDisplayOptions) => void
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
  /** Hint when dated tasks are hidden from the calendar. */
  calendarHint?: string
}

export function PlannerView({
  items,
  categories,
  listOptions,
  displayOptions,
  taskListLabel,
  onListOptionsChange,
  onItemTap,
  onToggleComplete,
  calendarHint,
}: PlannerViewProps) {
  const tasks = items.filter((item) => isTaskOrReminder(item, categories))
  const pending = tasks.filter((t) => !t.completed)
  const done = listOptions.hideCompleted ? [] : tasks.filter((t) => t.completed)

  const toEntries = (list: CalendarItem[]): DayItemEntry[] =>
    list.map((item) => ({ item, spanPosition: 'single' as const }))

  return (
    <div className="px-4 pb-6 pt-2 safe-top">
      <div className="mb-4 flex items-start justify-between gap-2">
        <SectionHeader
          title={TODO_SECTION_LABEL}
          titlePrefix={
            <CheckSquare
              size={28}
              strokeWidth={2.25}
              className="shrink-0 text-wf-accent"
              aria-hidden
            />
          }
          subtitle={plannerSubtitle(taskListLabel, pending.length, done.length)}
        />
        <ListOptionsMenu
          categories={categories}
          options={listOptions}
          onChange={onListOptionsChange}
        />
      </div>

      {taskListLabel && (
        <p className="mb-3 text-caption text-wf-text-tertiary">
          Synced with {taskListLabel}. Use the calendar toggle to show dated tasks on their due date.
        </p>
      )}

      {calendarHint && (
        <p className="mb-4 rounded-xl bg-wf-bg px-4 py-3 text-caption text-wf-text-secondary">
          {calendarHint}
        </p>
      )}

      <section className="mb-4 overflow-hidden rounded-[var(--radius-lg)] bg-wf-surface shadow-[var(--shadow-card)]">
        <h2 className="border-b border-wf-border px-4 py-2.5 text-subhead font-semibold text-wf-text-secondary">
          {taskListLabel ?? 'To do'}
        </h2>
        <div className="px-2 py-2">
          <GroupedItemList
            entries={toEntries(pending)}
            viewDate={new Date()}
            categories={categories}
            listOptions={listOptions}
            displayOptions={displayOptions}
            emptyMessage={taskListLabel ? `No open tasks in ${taskListLabel}` : 'All caught up'}
            onItemTap={onItemTap}
            onToggleComplete={onToggleComplete}
          />
        </div>
      </section>

      {done.length > 0 && (
        <section className="overflow-hidden rounded-[var(--radius-lg)] bg-wf-surface opacity-60 shadow-[var(--shadow-card)]">
          <h2 className="border-b border-wf-border px-4 py-2.5 text-subhead font-semibold text-wf-text-secondary">
            Completed
          </h2>
          <div className="px-2 py-2">
            {done.map((item) => (
              <CalendarItemRow
                key={item.id}
                item={item}
                categories={categories}
                viewDate={parseDate(item.date)}
                displayOptions={displayOptions}
                onTap={onItemTap}
                onToggleComplete={onToggleComplete}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
