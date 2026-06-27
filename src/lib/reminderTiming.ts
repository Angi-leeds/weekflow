import type { EmailActionFlowOptions, TaskReminderKind } from '../../shared/emailActionFlow'
import { addDays, parseDate, toISODate } from '../dateUtils'

export const REMINDER_PRESET_DAYS = [1, 3, 7, 14] as const

export function resolveTaskReminderDate(
  options: Pick<EmailActionFlowOptions, 'taskReminderKind' | 'taskLeadDays' | 'taskReminderDate'>,
  dueDateIso: string,
): string {
  if (options.taskReminderKind === 'date' && options.taskReminderDate) {
    return options.taskReminderDate
  }
  return toISODate(addDays(parseDate(dueDateIso), -options.taskLeadDays))
}

export function formatTaskReminderSummary(
  options: Pick<EmailActionFlowOptions, 'taskReminderKind' | 'taskLeadDays' | 'taskReminderDate'>,
): string {
  if (options.taskReminderKind === 'date' && options.taskReminderDate) {
    const [y, m, d] = options.taskReminderDate.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const days = options.taskLeadDays
  if (days === 1) return '1 day before'
  if (days === 7) return '1 week before'
  if (days === 14) return '2 weeks before'
  if (days > 1 && days % 7 === 0) return `${days / 7} weeks before`
  return `${days} days before`
}

export function splitLeadDays(days: number): { amount: number; unit: 'days' | 'weeks' } {
  if (days >= 7 && days % 7 === 0) {
    return { amount: days / 7, unit: 'weeks' }
  }
  return { amount: Math.max(1, days), unit: 'days' }
}

export function leadDaysFromAmount(amount: number, unit: 'days' | 'weeks'): number {
  const safe = Math.max(1, Math.floor(amount) || 1)
  return unit === 'weeks' ? safe * 7 : safe
}

export type ReminderTimingValue = {
  kind: TaskReminderKind
  leadDays: number
  reminderDate?: string
}
