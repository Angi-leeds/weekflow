import type { BoardPin } from '../../shared/boardPins'
import type { SharedBoardItem } from '../../shared/boardPins'
import type { CalendarItem, Category, ListDisplayOptions } from '../types'
import { WeekListPortrait } from './WeekListPortrait'
import { FamilyBoardView } from './FamilyBoardView'

interface BoardSplitViewProps {
  weekStart: Date
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  sharedItems: SharedBoardItem[]
  pins: BoardPin[]
  onPinsChange: (pins: BoardPin[]) => void
  onItemTap: (item: CalendarItem) => void
  onSharedItemTap?: (item: SharedBoardItem) => void
  onEnterKiosk?: () => void
}

export function BoardSplitView({
  weekStart,
  items,
  categories,
  listOptions,
  sharedItems,
  pins,
  onPinsChange,
  onItemTap,
  onSharedItemTap,
  onEnterKiosk,
}: BoardSplitViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div className="min-h-[240px] shrink-0 border-b border-wf-border md:h-full md:w-[42%] md:min-h-0 md:border-b-0 md:border-r">
        <div className="border-b border-wf-border px-4 py-2">
          <h2 className="font-display text-body font-bold">This week</h2>
          <p className="text-caption text-wf-text-tertiary">Calendar alongside family board</p>
        </div>
        <div className="h-[calc(100%-52px)] min-h-[200px] overflow-y-auto">
          <WeekListPortrait
            weekStart={weekStart}
            items={items}
            categories={categories}
            listOptions={listOptions}
            onItemTap={onItemTap}
          />
        </div>
      </div>

      <div className="min-h-[320px] flex-1 md:min-h-0">
        <FamilyBoardView
          sharedItems={sharedItems}
          pins={pins}
          onPinsChange={onPinsChange}
          onItemTap={onSharedItemTap}
          onEnterKiosk={onEnterKiosk}
        />
      </div>
    </div>
  )
}
