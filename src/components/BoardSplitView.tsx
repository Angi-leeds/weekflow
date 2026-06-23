import { useEffect, useState } from 'react'
import type { BoardPin } from '../../shared/boardPins'
import type { SharedBoardItem } from '../../shared/boardPins'
import type { EntityType, ItemLink } from '../../shared/links'
import type { BoardLayoutMode, KanbanGroupBy } from '../../shared/boardLayout'
import type { CalendarItem, Category, EmailMessage, ListDisplayOptions } from '../types'
import {
  loadBoardLayout,
  loadKanbanGroupBy,
  loadSleepModeEnabled,
  saveBoardLayout,
  saveKanbanGroupBy,
  saveSleepModeEnabled,
} from '../lib/boardSettings'
import { createVoicePin } from '../lib/boardPins'
import { WeekListPortrait } from './WeekListPortrait'
import { FamilyBoardView } from './FamilyBoardView'
import { KanbanBoardView } from './KanbanBoardView'
import { BoardLayoutToolbar } from './BoardLayoutToolbar'
import { BoardSleepOverlay } from './BoardSleepOverlay'

interface BoardSplitViewProps {
  weekStart: Date
  items: CalendarItem[]
  categories: Category[]
  listOptions: ListDisplayOptions
  sharedItems: SharedBoardItem[]
  pins: BoardPin[]
  links: ItemLink[]
  emails: EmailMessage[]
  onPinsChange: (pins: BoardPin[]) => void
  onPinUpdate: (pin: BoardPin) => void
  onItemTap: (item: CalendarItem) => void
  onSharedItemTap?: (item: SharedBoardItem) => void
  onNavigateLink: (type: EntityType, id: string) => void
  onEnterKiosk?: () => void
  canDismissVoicePins?: boolean
  canManageBoardLayout?: boolean
}

export function BoardSplitView({
  weekStart,
  items,
  categories,
  listOptions,
  sharedItems,
  pins,
  links,
  emails,
  onPinsChange,
  onPinUpdate,
  onItemTap,
  onSharedItemTap,
  onNavigateLink,
  onEnterKiosk,
  canDismissVoicePins = false,
  canManageBoardLayout = true,
}: BoardSplitViewProps) {
  const [layout, setLayout] = useState<BoardLayoutMode>(() => loadBoardLayout())
  const [kanbanGroupBy, setKanbanGroupBy] = useState<KanbanGroupBy>(() => loadKanbanGroupBy())
  const [sleepModeEnabled, setSleepModeEnabled] = useState(() => loadSleepModeEnabled())
  const [sleepActive, setSleepActive] = useState(false)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)

  useEffect(() => {
    saveBoardLayout(layout)
  }, [layout])

  useEffect(() => {
    saveKanbanGroupBy(kanbanGroupBy)
  }, [kanbanGroupBy])

  useEffect(() => {
    saveSleepModeEnabled(sleepModeEnabled)
  }, [sleepModeEnabled])

  useEffect(() => {
    if (!sleepModeEnabled) {
      setSleepActive(false)
      return
    }

    let idleTimer: number | undefined
    const idleMs = 45000

    const resetIdle = () => {
      window.clearTimeout(idleTimer)
      setSleepActive(false)
      idleTimer = window.setTimeout(() => setSleepActive(true), idleMs)
    }

    resetIdle()
    window.addEventListener('pointerdown', resetIdle)
    window.addEventListener('keydown', resetIdle)

    return () => {
      window.clearTimeout(idleTimer)
      window.removeEventListener('pointerdown', resetIdle)
      window.removeEventListener('keydown', resetIdle)
    }
  }, [sleepModeEnabled])

  const selectedPin = pins.find((pin) => pin.id === selectedPinId)

  const handlePinStyleChange = (emoji: string) => {
    if (!selectedPin) return
    void onPinUpdate({ ...selectedPin, pinStyle: emoji })
  }

  const handleAddVoicePin = async () => {
    const message = window.prompt('Voice message (mock):', 'Feed the cat before school')
    if (!message?.trim()) return
    const pin = await createVoicePin({ message: message.trim(), from: 'Mum' })
    void onPinUpdate(pin)
    setSelectedPinId(pin.id)
  }

  const boardPanel =
    layout === 'kanban' ? (
      <KanbanBoardView
        sharedItems={sharedItems}
        pins={pins}
        items={items}
        categories={categories}
        links={links}
        emails={emails}
        groupBy={kanbanGroupBy}
        onGroupByChange={setKanbanGroupBy}
        onItemTap={onSharedItemTap}
        onNavigateLink={onNavigateLink}
        onPinUpdate={onPinUpdate}
        canDismissVoicePins={canDismissVoicePins}
      />
    ) : (
      <FamilyBoardView
        sharedItems={sharedItems}
        pins={pins}
        links={links}
        items={items}
        emails={emails}
        onPinsChange={onPinsChange}
        onPinUpdate={onPinUpdate}
        canDismissVoicePins={canDismissVoicePins}
        onItemTap={onSharedItemTap}
        onNavigateLink={onNavigateLink}
        selectedPinId={selectedPinId}
        onSelectPin={setSelectedPinId}
        onEnterKiosk={onEnterKiosk}
      />
    )

  return (
    <div className="flex h-full min-h-0 flex-col">
      {canManageBoardLayout && (
        <BoardLayoutToolbar
          layout={layout}
          sleepModeEnabled={sleepModeEnabled}
          selectedPinStyle={selectedPin?.pinStyle}
          onLayoutChange={setLayout}
          onSleepModeToggle={setSleepModeEnabled}
          onPinStyleChange={layout !== 'kanban' ? handlePinStyleChange : undefined}
          onAddVoicePin={handleAddVoicePin}
        />
      )}

      <div className={`flex min-h-0 flex-1 ${layout === 'split' ? 'flex-col md:flex-row' : 'flex-col'}`}>
        {layout === 'split' && (
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
        )}

        <div className="min-h-[320px] flex-1 md:min-h-0">{boardPanel}</div>
      </div>

      <BoardSleepOverlay
        active={sleepActive}
        items={sharedItems}
        onDismiss={() => setSleepActive(false)}
      />
    </div>
  )
}
