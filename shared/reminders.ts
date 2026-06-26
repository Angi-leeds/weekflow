export type ItemReminderPreset =
  | 'none'
  | 'at-time'
  | '5min'
  | '15min'
  | '30min'
  | '1hour'
  | '2hours'
  | '4hours'
  | '1day'
  | '2days'
  | '3days'
  | '1week'
  | 'custom'
  | 'datetime'

export interface ReminderItemFields {
  date: string
  endDate?: string
  startTime?: string
  endTime?: string
  allDay: boolean
  reminderPreset?: ItemReminderPreset
  reminderCustomMinutes?: number
  reminderAt?: string
}

export const REMINDER_PRESET_MINUTES: Partial<Record<ItemReminderPreset, number>> = {
  'at-time': 0,
  '5min': 5,
  '15min': 15,
  '30min': 30,
  '1hour': 60,
  '2hours': 120,
  '4hours': 240,
  '1day': 24 * 60,
  '2days': 2 * 24 * 60,
  '3days': 3 * 24 * 60,
  '1week': 7 * 24 * 60,
}

export function getEventStartDateTime(item: ReminderItemFields): Date {
  if (item.allDay || !item.startTime) {
    return new Date(`${item.date}T09:00:00`)
  }
  return new Date(`${item.date}T${item.startTime}:00`)
}

export function getReminderMinutesBefore(item: ReminderItemFields): number | null {
  const preset = item.reminderPreset ?? 'none'
  if (preset === 'none') return null
  if (preset === 'custom') {
    return item.reminderCustomMinutes != null && item.reminderCustomMinutes >= 0
      ? item.reminderCustomMinutes
      : null
  }
  if (preset === 'datetime') {
    if (!item.reminderAt) return null
    const startMs = getEventStartDateTime(item).getTime()
    const remindMs = new Date(item.reminderAt).getTime()
    if (Number.isNaN(remindMs)) return null
    return Math.max(0, Math.round((startMs - remindMs) / 60_000))
  }
  const minutes = REMINDER_PRESET_MINUTES[preset]
  return minutes != null ? minutes : null
}

export function minutesToReminderPreset(minutes: number): Pick<ReminderItemFields, 'reminderPreset' | 'reminderCustomMinutes'> {
  if (minutes <= 0) return { reminderPreset: 'at-time' }
  for (const [preset, value] of Object.entries(REMINDER_PRESET_MINUTES)) {
    if (value === minutes) {
      return { reminderPreset: preset as ItemReminderPreset }
    }
  }
  return { reminderPreset: 'custom', reminderCustomMinutes: minutes }
}

export function getReminderDateTimeForSync(
  item: ReminderItemFields,
  timeZone: string,
): { dateTime: string; timeZone: string } | null {
  const preset = item.reminderPreset ?? 'none'
  if (preset === 'none') return null

  if (preset === 'datetime' && item.reminderAt) {
    const normalized = item.reminderAt.includes('T')
      ? item.reminderAt
      : `${item.reminderAt}T09:00:00`
    return { dateTime: normalized.length === 16 ? `${normalized}:00` : normalized, timeZone }
  }

  const minutes = getReminderMinutesBefore(item)
  if (minutes == null) return null

  const remindAt = getEventStartDateTime(item)
  remindAt.setMinutes(remindAt.getMinutes() - minutes)
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateTime = `${remindAt.getFullYear()}-${pad(remindAt.getMonth() + 1)}-${pad(remindAt.getDate())}T${pad(remindAt.getHours())}:${pad(remindAt.getMinutes())}:00`
  return { dateTime, timeZone }
}
