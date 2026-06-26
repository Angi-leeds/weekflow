import type { CalendarItem, ItemReminderPreset } from '../types'
import {
  getEventStartDateTime,
  getReminderDateTimeForSync,
  getReminderMinutesBefore,
  minutesToReminderPreset,
  REMINDER_PRESET_MINUTES,
  type ReminderItemFields,
} from '../../shared/reminders'

export { REMINDER_PRESET_MINUTES }

export const ITEM_REMINDER_PRESET_OPTIONS: ItemReminderPreset[] = [
  'none',
  'at-time',
  '5min',
  '15min',
  '30min',
  '1hour',
  '2hours',
  '4hours',
  '1day',
  '2days',
  '3days',
  '1week',
  'custom',
  'datetime',
]

export function hasActiveReminder(item: CalendarItem): boolean {
  return getReminderMinutesBefore(item) != null || (item.reminderPreset === 'datetime' && Boolean(item.reminderAt))
}

export function formatReminderLabel(item: CalendarItem): string | null {
  const preset = item.reminderPreset ?? 'none'
  if (preset === 'none') return null
  if (preset === 'datetime' && item.reminderAt) {
    const value = new Date(item.reminderAt)
    if (Number.isNaN(value.getTime())) return 'Reminder set'
    return `Remind ${value.toLocaleString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }
  if (preset === 'custom' && item.reminderCustomMinutes != null) {
    return formatMinutesBeforeLabel(item.reminderCustomMinutes)
  }
  const minutes = REMINDER_PRESET_MINUTES[preset]
  if (minutes == null) return null
  return formatMinutesBeforeLabel(minutes)
}

function formatMinutesBeforeLabel(minutes: number): string {
  if (minutes === 0) return 'At time of event'
  if (minutes < 60) return `${minutes} min before`
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60)
    return days === 1 ? '1 day before' : `${days} days before`
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return hours === 1 ? '1 hour before' : `${hours} hours before`
  }
  return `${minutes} min before`
}

export function splitReminderAt(value?: string): { date: string; time: string } {
  if (!value) return { date: '', time: '09:00' }
  const [date, timePart] = value.split('T')
  return { date: date ?? '', time: timePart?.slice(0, 5) ?? '09:00' }
}

export function joinReminderAt(date: string, time: string): string | undefined {
  if (!date) return undefined
  return `${date}T${time || '09:00'}`
}

export {
  getEventStartDateTime,
  getReminderDateTimeForSync,
  getReminderMinutesBefore,
  minutesToReminderPreset,
  type ReminderItemFields,
}
