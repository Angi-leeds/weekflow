import type { CalendarItem, Category } from '../types'
import { getCategoryById, isTaskCategory } from '../categories'

export function getClientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London'
  } catch {
    return 'Europe/London'
  }
}

export function hasExplicitTime(item: {
  startTime?: string
  endTime?: string
}): boolean {
  return Boolean(item.startTime?.trim() || item.endTime?.trim())
}

export function isEventItem(item: CalendarItem, categories: Category[]): boolean {
  const cat = getCategoryById(categories, item.categoryId)
  return cat?.kind === 'event'
}

/**
 * Events with no start/end time are all-day (syncs as isAllDay to Outlook/Google).
 * Tasks/reminders with no time stay untimed ("Anytime" in the UI).
 */
export function normalizeItemSchedule(
  item: CalendarItem,
  categories: Category[],
): CalendarItem {
  const isTask = isTaskCategory(categories, item.categoryId)

  if (!hasExplicitTime(item)) {
    if (!isTask) {
      return {
        ...item,
        allDay: true,
        startTime: undefined,
        endTime: undefined,
      }
    }
    return {
      ...item,
      startTime: undefined,
      endTime: undefined,
    }
  }

  if (!isTask && item.allDay) {
    return {
      ...item,
      allDay: false,
    }
  }

  return item
}

export function isEffectivelyAllDay(item: CalendarItem, categories: Category[]): boolean {
  if (item.allDay) return true
  if (isTaskCategory(categories, item.categoryId)) return false
  return !hasExplicitTime(item)
}

/** Keep form all-day checkbox in sync while editing event times. */
export function deriveAllDayFromTimes(
  item: CalendarItem,
  categories: Category[],
  allDay: boolean,
): boolean {
  if (isTaskCategory(categories, item.categoryId)) return allDay
  if (hasExplicitTime(item)) return false
  return true
}
