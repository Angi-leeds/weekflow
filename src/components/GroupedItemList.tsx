import type { DayItemEntry } from '../dateUtils'
import type { CalendarItem, Category, ItemDisplayOptions, ListDisplayOptions } from '../types'
import { DEFAULT_ITEM_DISPLAY } from '../types'
import { groupDayItemEntries } from '../groupUtils'
import { CalendarItemRow } from './CalendarItem'
import { CategoryGroupHeader } from './ui/CategoryGroupHeader'

interface GroupedItemListProps {
  entries: DayItemEntry[]
  viewDate: Date
  categories: Category[]
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  compact?: boolean
  emptyMessage?: string
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function GroupedItemList({
  entries,
  viewDate,
  categories,
  listOptions,
  displayOptions = DEFAULT_ITEM_DISPLAY,
  compact = false,
  emptyMessage = 'Nothing scheduled',
  onItemTap,
  onToggleComplete,
}: GroupedItemListProps) {
  const groups = groupDayItemEntries(entries, listOptions, categories)
  const showCategoryBadge = listOptions.groupBy !== 'category'

  if (groups.length === 0 || groups.every((g) => g.entries.length === 0)) {
    return (
      <p className={`text-wf-text-tertiary ${compact ? 'px-1 py-4 text-center text-[12px]' : 'px-2 py-4 text-subhead'}`}>
        {emptyMessage}
      </p>
    )
  }

  const flat = listOptions.groupBy === 'none'

  if (flat) {
    const all = groups[0]?.entries ?? []
    return (
      <div className={compact ? '' : 'px-0'}>
        {all.map(({ item, spanPosition }) => (
          <CalendarItemRow
            key={item.id}
            item={item}
            categories={categories}
            spanPosition={spanPosition}
            viewDate={viewDate}
            compact={compact || displayOptions.density !== 'comfortable'}
            displayOptions={displayOptions}
            hideCategoryBadge={!displayOptions.showCategoryBadge || listOptions.groupBy === 'category'}
            onTap={onItemTap}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {groups.map((group, gi) => (
        <div key={group.id}>
          <CategoryGroupHeader
            label={group.label}
            colour={group.colour}
            count={group.entries.length}
            compact={compact}
          />
          <div className={compact ? 'px-0.5' : 'px-0'}>
            {group.entries.map(({ item, spanPosition }) => (
              <CalendarItemRow
                key={item.id}
                item={item}
                categories={categories}
                spanPosition={spanPosition}
                viewDate={viewDate}
                compact={compact || displayOptions.density !== 'comfortable'}
                displayOptions={displayOptions}
                hideCategoryBadge={!displayOptions.showCategoryBadge || !showCategoryBadge}
                onTap={onItemTap}
                onToggleComplete={onToggleComplete}
              />
            ))}
          </div>
          {gi < groups.length - 1 && (
            <div className={`${compact ? 'mx-1' : 'mx-2'} my-1 border-b border-wf-border/60`} />
          )}
        </div>
      ))}
    </div>
  )
}
