import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CalendarItem, Category } from '../types'
import { formatItemClipboardText } from '../lib/calendarItemHelpers'
import { copyTextToClipboard } from '../lib/appleLinks'
import { isTaskOrReminder } from '../components/itemHelpers'
import { ContextMenu, type ContextMenuItem } from '../components/ui/ContextMenu'

export interface CalendarMenuActions {
  onOpenItem: (item: CalendarItem) => void
  onCopyItem: (item: CalendarItem) => void
  onDuplicateItem: (item: CalendarItem, targetDate: Date) => void
  onDeleteItem: (id: string) => void
  onToggleComplete: (id: string) => void
  onNewEvent: (date: Date) => void
  onGoToDay: (date: Date) => void
  onPasteToDay: (date: Date) => void
}

interface CalendarMenuContextValue {
  clipboardItem: CalendarItem | null
  clipboardItemId: string | null
  openItemMenu: (item: CalendarItem, x: number, y: number, viewDate?: Date) => void
  openDayMenu: (date: Date, x: number, y: number) => void
}

const CalendarMenuContext = createContext<CalendarMenuContextValue | null>(null)

interface CalendarMenuProviderProps {
  categories: Category[]
  clipboardItem: CalendarItem | null
  actions: CalendarMenuActions
  children: ReactNode
}

type MenuState =
  | { kind: 'item'; x: number; y: number; item: CalendarItem; viewDate?: Date }
  | { kind: 'day'; x: number; y: number; date: Date }
  | null

export function CalendarMenuProvider({
  categories,
  clipboardItem,
  actions,
  children,
}: CalendarMenuProviderProps) {
  const [menu, setMenu] = useState<MenuState>(null)

  const closeMenu = useCallback(() => setMenu(null), [])

  const openItemMenu = useCallback((item: CalendarItem, x: number, y: number, viewDate?: Date) => {
    setMenu({ kind: 'item', x, y, item, viewDate })
  }, [])

  const openDayMenu = useCallback((date: Date, x: number, y: number) => {
    setMenu({ kind: 'day', x, y, date })
  }, [])

  const menuItems: ContextMenuItem[] = useMemo(() => {
    if (!menu) return []

    if (menu.kind === 'item') {
      const { item, viewDate } = menu
      const isTask = isTaskOrReminder(item, categories)
      const duplicateDate = viewDate ?? new Date(item.date)
      const items: ContextMenuItem[] = [
        {
          id: 'open',
          label: 'Open',
          onSelect: () => actions.onOpenItem(item),
        },
        {
          id: 'copy',
          label: 'Copy',
          onSelect: () => actions.onCopyItem(item),
        },
        {
          id: 'duplicate',
          label: 'Duplicate here',
          onSelect: () => actions.onDuplicateItem(item, duplicateDate),
        },
      ]

      if (isTask) {
        items.push({
          id: 'complete',
          label: item.completed ? 'Mark incomplete' : 'Mark complete',
          onSelect: () => actions.onToggleComplete(item.id),
        })
      }

      items.push(
        {
          id: 'copy-title',
          label: 'Copy title',
          onSelect: () => {
            void copyTextToClipboard(item.title)
          },
        },
        {
          id: 'copy-details',
          label: 'Copy details',
          onSelect: () => {
            void copyTextToClipboard(formatItemClipboardText(item))
          },
        },
      )

      if (item.onlineMeetingUrl) {
        items.push({
          id: 'teams',
          label: 'Open Teams meeting',
          onSelect: () => {
            window.open(item.onlineMeetingUrl, '_blank', 'noopener,noreferrer')
          },
        })
      }

      items.push({
        id: 'delete',
        label: 'Delete',
        destructive: true,
        onSelect: () => actions.onDeleteItem(item.id),
      })

      return items
    }

    const pasteLabel = clipboardItem
      ? `Paste “${clipboardItem.title}”`
      : 'Paste'

    return [
      {
        id: 'paste',
        label: pasteLabel,
        disabled: !clipboardItem,
        onSelect: () => actions.onPasteToDay(menu.date),
      },
      {
        id: 'new',
        label: 'New event',
        onSelect: () => actions.onNewEvent(menu.date),
      },
      {
        id: 'day-view',
        label: 'Go to day view',
        onSelect: () => actions.onGoToDay(menu.date),
      },
    ]
  }, [actions, categories, clipboardItem, menu])

  const contextValue = useMemo(
    () => ({
      clipboardItem,
      clipboardItemId: clipboardItem?.id ?? null,
      openItemMenu,
      openDayMenu,
    }),
    [clipboardItem, openDayMenu, openItemMenu],
  )

  return (
    <CalendarMenuContext.Provider value={contextValue}>
      {children}
      <ContextMenu
        open={menu != null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        items={menuItems}
        onClose={closeMenu}
      />
    </CalendarMenuContext.Provider>
  )
}

export function useCalendarMenu(): CalendarMenuContextValue {
  const ctx = useContext(CalendarMenuContext)
  if (!ctx) {
    throw new Error('useCalendarMenu must be used within CalendarMenuProvider')
  }
  return ctx
}

export function useOptionalCalendarMenu(): CalendarMenuContextValue | null {
  return useContext(CalendarMenuContext)
}
