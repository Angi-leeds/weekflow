import type { CalendarItem } from '../types'
import { addDays, daysBetween, formatTimeRange, generateId, getItemEndDate, parseDate, toISODate } from '../dateUtils'

export function duplicateCalendarItem(item: CalendarItem, targetDate: Date): CalendarItem {
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  const sourceStart = parseDate(item.date)
  const deltaDays = daysBetween(sourceStart, target)

  const next: CalendarItem = {
    ...item,
    id: generateId(),
    date: toISODate(addDays(sourceStart, deltaDays)),
    externalId: undefined,
    onlineMeetingUrl: undefined,
    inviteResponse: undefined,
    completed: item.completed ?? false,
  }

  if (item.endDate) {
    next.endDate = toISODate(addDays(parseDate(item.endDate), deltaDays))
  }

  return next
}

export function formatItemClipboardText(item: CalendarItem): string {
  const lines = [item.title]
  if (item.allDay) {
    lines.push(item.endDate && item.endDate !== item.date ? `${item.date} – ${item.endDate}` : item.date)
  } else if (item.startTime) {
    lines.push(formatTimeRange(item.startTime, item.endTime))
    lines.push(item.date)
  } else {
    lines.push(item.date)
  }
  if (item.notes) lines.push(item.notes)
  return lines.join('\n')
}
