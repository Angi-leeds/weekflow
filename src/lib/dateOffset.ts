import { addDays, addWeeks, daysBetween, toISODate } from '../dateUtils'
import { todayCalendarDate } from './calendarNavigation'

export type DateJumpAnchor = 'today' | 'reference'

function normalizeDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Signed day count from today to the given date (positive = future). */
export function offsetDaysFromToday(date: Date): number {
  return daysBetween(todayCalendarDate(), normalizeDay(date))
}

export function decomposeDayOffset(totalDays: number): { weeks: number; days: number } {
  const abs = Math.abs(totalDays)
  return {
    weeks: Math.floor(abs / 7),
    days: abs % 7,
  }
}

/** Compact badge label, e.g. "+2w 3d" or "-1w". Returns null on today. */
export function formatCompactOffsetFromToday(date: Date): string | null {
  const offset = offsetDaysFromToday(date)
  if (offset === 0) return null

  const sign = offset > 0 ? '+' : '-'
  const { weeks, days } = decomposeDayOffset(offset)
  const parts: string[] = []
  if (weeks > 0) parts.push(`${weeks}w`)
  if (days > 0) parts.push(`${days}d`)
  if (parts.length === 0) return null
  return `${sign}${parts.join(' ')}`
}

/** Tooltip / aria description, e.g. "2 weeks 3 days ahead of today". */
export function formatVerboseOffsetFromToday(date: Date): string {
  const offset = offsetDaysFromToday(date)
  if (offset === 0) return 'Today'

  const { weeks, days } = decomposeDayOffset(offset)
  const parts: string[] = []
  if (weeks > 0) parts.push(`${weeks} week${weeks === 1 ? '' : 's'}`)
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  const span = parts.join(' ')
  return offset > 0 ? `${span} ahead of today` : `${span} before today`
}

export function computeJumpDate(
  anchor: DateJumpAnchor,
  referenceDate: Date,
  weeks: number,
  days: number,
): Date {
  const base = anchor === 'today' ? todayCalendarDate() : normalizeDay(referenceDate)
  return addDays(addWeeks(base, weeks), days)
}

export function formatJumpAnchorLabel(anchor: DateJumpAnchor, referenceDate: Date): string {
  if (anchor === 'today') return 'From today'
  return `From selected · ${referenceDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

export function formatISODateShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function jumpTargetPreview(
  anchor: DateJumpAnchor,
  referenceDate: Date,
  weeks: number,
  days: number,
): string {
  const target = computeJumpDate(anchor, referenceDate, weeks, days)
  return formatISODateShort(toISODate(target))
}
