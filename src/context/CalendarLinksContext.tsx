import { createContext, useContext } from 'react'
import type { EntityType, ItemLink } from '../../shared/links'
import type { CalendarItem } from '../types'

export interface CalendarLinksContextValue {
  links: ItemLink[]
  items: CalendarItem[]
  onNavigateLink?: (type: EntityType, id: string) => void
}

const CalendarLinksContext = createContext<CalendarLinksContextValue | null>(null)

export function CalendarLinksProvider({
  value,
  children,
}: {
  value: CalendarLinksContextValue
  children: React.ReactNode
}) {
  return <CalendarLinksContext.Provider value={value}>{children}</CalendarLinksContext.Provider>
}

export function useCalendarLinks(): CalendarLinksContextValue | null {
  return useContext(CalendarLinksContext)
}
