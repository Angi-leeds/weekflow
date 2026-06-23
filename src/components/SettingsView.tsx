import { useMemo } from 'react'
import type { CalendarItem, Category, ListDisplayOptions } from '../types'
import { LIST_GROUP_LABELS, LIST_SORT_LABELS } from '../types'
import { CategoriesManager } from './CategoriesManager'
import { ListOptionsMenu } from './ui/ListOptionsMenu'
import { SectionHeader } from './ui/SectionHeader'

interface SettingsViewProps {
  categories: Category[]
  items: CalendarItem[]
  listOptions: ListDisplayOptions
  onListOptionsChange: (options: ListDisplayOptions) => void
  onSaveCategory: (category: Category) => void
  onDeleteCategory: (id: string) => void
}

export function SettingsView({
  categories,
  items,
  listOptions,
  onListOptionsChange,
  onSaveCategory,
  onDeleteCategory,
}: SettingsViewProps) {
  const categorySummary =
    listOptions.categoryFilter && listOptions.categoryFilter.length > 0
      ? `${listOptions.categoryFilter.length} selected`
      : 'All'

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1
    }
    return counts
  }, [items])

  return (
    <div className="px-4 pb-6 pt-2 safe-top">
      <div className="mb-4 flex items-start justify-between gap-2">
        <SectionHeader title="Settings" />
        <ListOptionsMenu
          categories={categories}
          options={listOptions}
          onChange={onListOptionsChange}
        />
      </div>

      <SettingsGroup title="Categories">
        <p className="px-4 pb-3 pt-1 text-caption text-wf-text-tertiary">
          Customise colours and labels. Items inherit their category colour.
        </p>
        <div className="px-4 pb-4">
          <CategoriesManager
            categories={categories}
            itemCounts={itemCounts}
            onSave={onSaveCategory}
            onDelete={onDeleteCategory}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title="List display">
        <SettingsRow label="Group by" value={LIST_GROUP_LABELS[listOptions.groupBy]} />
        <SettingsRow label="Sort" value={LIST_SORT_LABELS[listOptions.sortBy]} />
        <SettingsRow label="Categories shown" value={categorySummary} />
        <SettingsRow label="Hide completed" value={listOptions.hideCompleted ? 'On' : 'Off'} />
      </SettingsGroup>

      <SettingsGroup title="Calendar">
        <SettingsRow label="Default view" value="Week list" />
        <SettingsRow label="Week starts on" value="Monday" />
        <SettingsRow label="Time format" value="24 hour" />
      </SettingsGroup>

      <SettingsGroup title="Email">
        <SettingsRow label="Connected accounts" value="None (mock)" />
        <SettingsRow label="Gmail" value="Coming soon" muted />
        <SettingsRow label="Outlook / Microsoft 365" value="Coming soon" muted />
        <SettingsRow label="Apple Mail" value="Coming soon" muted />
      </SettingsGroup>

      <SettingsGroup title="Integrations">
        <SettingsRow label="Apple Calendar" value="Coming soon" muted />
        <SettingsRow label="Google Calendar" value="Coming soon" muted />
        <SettingsRow label="Notifications" value="Coming soon" muted />
      </SettingsGroup>

      <SettingsGroup title="About">
        <SettingsRow label="Version" value="0.1.0 prototype" />
        <SettingsRow label="App" value="WeekFlow" />
      </SettingsGroup>
    </div>
  )
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 px-3 text-subhead font-semibold text-wf-text-secondary">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl bg-wf-surface shadow-[var(--shadow-card)]">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-wf-border/50 px-4 py-3.5 last:border-0">
      <span className="text-body font-medium text-wf-text">{label}</span>
      <span className={`text-body ${muted ? 'text-wf-text-tertiary' : 'text-wf-text-secondary'}`}>
        {value}
      </span>
    </div>
  )
}
