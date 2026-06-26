import type { CalendarViewMode } from '../types'
import { parseDate, toISODate } from '../dateUtils'

const NAV_KEY = 'weekflow-calendar-navigation'

export interface CalendarNavigationState {
  focusDate: string
  viewMode?: CalendarViewMode
}

export function normalizeCalendarDate(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function todayCalendarDate(): Date {
  return normalizeCalendarDate(new Date())
}

/** Keep the same day-of-month when the user scrolls to another month (clamp to month length). */
export function clampDateToMonth(focus: Date, month: Date): Date {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const day = Math.min(focus.getDate(), lastDay)
  return normalizeCalendarDate(new Date(year, monthIndex, day))
}

export function loadCalendarNavigation(): CalendarNavigationState | null {
  try {
    const raw = localStorage.getItem(NAV_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CalendarNavigationState>
    if (typeof parsed.focusDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.focusDate)) {
      return null
    }
    return {
      focusDate: parsed.focusDate,
      viewMode: parsed.viewMode,
    }
  } catch {
    return null
  }
}

export function saveCalendarNavigation(state: CalendarNavigationState): void {
  localStorage.setItem(NAV_KEY, JSON.stringify(state))
}

export function initialFocusDate(): Date {
  const stored = loadCalendarNavigation()?.focusDate
  return stored ? normalizeCalendarDate(parseDate(stored)) : todayCalendarDate()
}
