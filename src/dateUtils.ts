import type { CalendarItem } from './types'
import { getTimeFormat } from './lib/appSettings'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export type SpanPosition = 'single' | 'start' | 'middle' | 'end'

export interface DayItemEntry {
  item: CalendarItem
  spanPosition: SpanPosition
}

export interface WeekSpanSegment {
  item: CalendarItem
  startCol: number
  spanCols: number
  continuesBefore: boolean
  continuesAfter: boolean
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getItemEndDate(item: CalendarItem): string {
  return item.endDate ?? item.date
}

export function isMultiDay(item: CalendarItem): boolean {
  return getItemEndDate(item) > item.date
}

export function itemSpansDate(item: CalendarItem, date: Date): boolean {
  const iso = toISODate(date)
  const end = getItemEndDate(item)
  return iso >= item.date && iso <= end
}

export function getSpanPosition(item: CalendarItem, date: Date): SpanPosition {
  const iso = toISODate(date)
  const end = getItemEndDate(item)
  if (!isMultiDay(item)) return 'single'
  if (iso === item.date) return 'start'
  if (iso === end) return 'end'
  return 'middle'
}

export function getSpanDayNumber(item: CalendarItem, date: Date): number {
  const start = parseDate(item.date)
  const d = parseDate(toISODate(date))
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000) + 1
}

export function getSpanTotalDays(item: CalendarItem): number {
  const start = parseDate(item.date)
  const end = parseDate(getItemEndDate(item))
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

export function formatDateRangeShort(startIso: string, endIso: string): string {
  const start = parseDate(startIso)
  const end = parseDate(endIso)
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) {
    return `${start.getDate()} – ${end.getDate()} ${MONTH_NAMES[start.getMonth()]}`
  }
  return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`
}

export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function formatDayHeader(date: Date): string {
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`
}

export function formatDayShort(date: Date): string {
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()}`
}

export function formatDayColumnHeader(date: Date): string {
  return DAY_NAMES[date.getDay()]
}

export function formatDayNumber(date: Date): string {
  return String(date.getDate())
}

export function formatMonthYear(date: Date): string {
  return `${FULL_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  if (sameMonth) {
    return `${weekStart.getDate()} – ${weekEnd.getDate()} ${FULL_MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
  }
  return `${formatDayHeader(weekStart)} – ${formatDayHeader(weekEnd)}`
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  if (getTimeFormat() === '24h') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const period = h >= 12 ? 'pm' : 'am'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')}${period}`
}

export function formatTimeRange(start?: string, end?: string): string {
  if (!start) return ''
  if (!end) return formatTime(start)
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function getMonthGrid(year: number, month: number, weekStartsOn = 1): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = (first.getDay() - weekStartsOn + 7) % 7
  const days: (Date | null)[] = []

  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  while (days.length % 7 !== 0) days.push(null)

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

const SPAN_SORT: Record<SpanPosition, number> = { start: 0, single: 0, middle: 1, end: 2 }

function sortDayItemEntries(entries: DayItemEntry[]): DayItemEntry[] {
  const allDay = entries.filter((e) => e.item.allDay)
  const timed = entries
    .filter((e) => !e.item.allDay && e.item.startTime)
    .sort((a, b) => (a.item.startTime ?? '').localeCompare(b.item.startTime ?? ''))
  const untimed = entries.filter((e) => !e.item.allDay && !e.item.startTime)

  allDay.sort((a, b) => SPAN_SORT[a.spanPosition] - SPAN_SORT[b.spanPosition])

  return [...allDay, ...timed, ...untimed]
}

export function getDayItemEntries(items: CalendarItem[], date: Date): DayItemEntry[] {
  const entries = items
    .filter((item) => itemSpansDate(item, date))
    .map((item) => ({
      item,
      spanPosition: getSpanPosition(item, date),
    }))

  return sortDayItemEntries(entries)
}

/** Day column/list entries — excludes multi-day all-day (shown as spanning bars). */
export function getDayItemEntriesForColumn(items: CalendarItem[], date: Date): DayItemEntry[] {
  return getDayItemEntries(items, date).filter(
    (e) => !(e.item.allDay && isMultiDay(e.item)),
  )
}

export function sortItemsForDay(items: CalendarItem[], date: Date): CalendarItem[] {
  return getDayItemEntries(items, date).map((e) => e.item)
}

export function getItemsForDate(items: CalendarItem[], date: Date): CalendarItem[] {
  return getDayItemEntries(items, date).map((e) => e.item)
}

export function getItemsForWeek(items: CalendarItem[], weekStart: Date): Map<string, CalendarItem[]> {
  const days = getWeekDays(weekStart)
  const map = new Map<string, CalendarItem[]>()
  for (const day of days) {
    map.set(toISODate(day), getItemsForDate(items, day))
  }
  return map
}

export function getWeekSpanSegments(items: CalendarItem[], weekStart: Date): WeekSpanSegment[] {
  const weekDays = getWeekDays(weekStart)
  const weekStartIso = toISODate(weekDays[0])
  const weekEndIso = toISODate(weekDays[6])
  const segments: WeekSpanSegment[] = []

  for (const item of items) {
    if (!item.allDay || !isMultiDay(item)) continue

    const itemEnd = getItemEndDate(item)
    if (itemEnd < weekStartIso || item.date > weekEndIso) continue

    const visibleStartIso = item.date < weekStartIso ? weekStartIso : item.date
    const visibleEndIso = itemEnd > weekEndIso ? weekEndIso : itemEnd

    const startCol = weekDays.findIndex((d) => toISODate(d) === visibleStartIso)
    const endCol = weekDays.findIndex((d) => toISODate(d) === visibleEndIso)
    if (startCol < 0 || endCol < 0) continue

    segments.push({
      item,
      startCol,
      spanCols: endCol - startCol + 1,
      continuesBefore: item.date < weekStartIso,
      continuesAfter: itemEnd > weekEndIso,
    })
  }

  return segments
}

/** Agenda list — multi-day items appear once on their start date. */
export function getAgendaEntries(items: CalendarItem[]): DayItemEntry[] {
  const seen = new Set<string>()
  const entries: DayItemEntry[] = []

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date))

  for (const item of sorted) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    entries.push({ item, spanPosition: isMultiDay(item) ? 'start' : 'single' })
  }

  return entries.sort((a, b) => {
    const dateCmp = a.item.date.localeCompare(b.item.date)
    if (dateCmp !== 0) return dateCmp
    return SPAN_SORT[a.spanPosition] - SPAN_SORT[b.spanPosition]
  })
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
