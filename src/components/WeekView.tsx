import type { CalendarItem, CalendarViewMode, Category, ItemDisplayOptions, ListDisplayOptions } from '../types'
import { useIsLandscape } from '../hooks/useMediaQuery'
import { WeekListPortrait } from './WeekListPortrait'
import { WeekBoardLandscape } from './WeekBoardLandscape'
import { WeekTimelineView } from './WeekTimelineView'

interface WeekViewProps {
  weekStart: Date
  items: CalendarItem[]
  categories: Category[]
  viewMode: CalendarViewMode
  listOptions: ListDisplayOptions
  displayOptions?: ItemDisplayOptions
  onItemTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
}

export function WeekView({
  weekStart,
  items,
  categories,
  viewMode,
  listOptions,
  displayOptions,
  onItemTap,
  onToggleComplete,
}: WeekViewProps) {
  const isLandscape = useIsLandscape()

  if (viewMode === 'week-timeline') {
    return (
      <WeekTimelineView
        weekStart={weekStart}
        items={items}
        onItemTap={onItemTap}
      />
    )
  }

  const showBoard =
    viewMode === 'week-board' || (viewMode === 'week-list' && isLandscape)

  if (showBoard) {
    return (
      <WeekBoardLandscape
        weekStart={weekStart}
        items={items}
        categories={categories}
        listOptions={listOptions}
        displayOptions={displayOptions}
        onItemTap={onItemTap}
        onToggleComplete={onToggleComplete}
      />
    )
  }

  return (
    <WeekListPortrait
      weekStart={weekStart}
      items={items}
      categories={categories}
      listOptions={listOptions}
      displayOptions={displayOptions}
      onItemTap={onItemTap}
      onToggleComplete={onToggleComplete}
    />
  )
}
