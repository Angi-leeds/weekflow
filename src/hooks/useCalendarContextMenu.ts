import { useCallback } from 'react'
import type { CalendarItem } from '../types'
import { useOptionalCalendarMenu } from '../context/CalendarMenuContext'
import { useContextMenuTrigger } from './useContextMenuTrigger'

const emptyTrigger = {}

export function useItemContextMenu(item: CalendarItem, viewDate?: Date) {
  const menu = useOptionalCalendarMenu()

  const open = useCallback(
    (x: number, y: number) => {
      menu?.openItemMenu(item, x, y, viewDate)
    },
    [item, menu, viewDate],
  )

  const trigger = useContextMenuTrigger(open)
  return menu ? trigger : emptyTrigger
}

export function useDayContextMenu(date: Date) {
  const menu = useOptionalCalendarMenu()

  const open = useCallback(
    (x: number, y: number) => {
      menu?.openDayMenu(date, x, y)
    },
    [date, menu],
  )

  const trigger = useContextMenuTrigger(open)
  return menu ? trigger : emptyTrigger
}
