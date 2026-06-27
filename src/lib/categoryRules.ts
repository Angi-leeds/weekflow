import type { CategoryAutomation, CategoryAutomationMap } from '../../shared/categoryAutomation'
import { categoryRecurrenceToItemRecurrence } from '../../shared/itemRecurrence'
import { minutesToReminderPreset } from '../../shared/reminders'
import type { CalendarItem, Category } from '../types'
import { resolveItemColour } from '../categories'

export interface CategoryRuleMatch {
  category: Category
  automation: CategoryAutomation
  matchedKeyword: string
}

export interface ApplyCategoryRuleOptions {
  applyCategory?: boolean
  applyReminder?: boolean
  applyRecurrence?: boolean
}

export interface ApplyCategoryRuleResult {
  item: CalendarItem
  appliedCategory: boolean
  appliedReminder: boolean
  appliedRecurrence: boolean
}

export function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase()
}

export function matchCategoryRule(
  title: string,
  notes: string | undefined,
  categories: Category[],
  automationMap: CategoryAutomationMap,
): CategoryRuleMatch | null {
  const haystackTitle = title.trim().toLowerCase()
  if (!haystackTitle) return null
  const haystackNotes = notes?.trim().toLowerCase() ?? ''

  let best: CategoryRuleMatch | null = null

  for (const category of categories) {
    const automation = automationMap[category.id]
    if (!automation?.enabled || automation.keywords.length === 0) continue

    for (const keyword of automation.keywords) {
      const normalized = normalizeKeyword(keyword)
      if (!normalized) continue

      const inTitle = haystackTitle.includes(normalized)
      const inNotes =
        automation.matchInNotes && haystackNotes.length > 0 && haystackNotes.includes(normalized)
      if (!inTitle && !inNotes) continue

      if (
        !best ||
        normalized.length > best.matchedKeyword.length ||
        (normalized.length === best.matchedKeyword.length &&
          category.name.localeCompare(best.category.name) < 0)
      ) {
        best = { category, automation, matchedKeyword: normalized }
      }
    }
  }

  return best
}

export function leadDaysToReminderFields(
  leadDays: number,
): Pick<CalendarItem, 'reminderPreset' | 'reminderCustomMinutes'> {
  const minutes = Math.max(1, Math.floor(leadDays)) * 24 * 60
  return minutesToReminderPreset(minutes)
}

export function applyCategoryRuleToItem(
  item: CalendarItem,
  match: CategoryRuleMatch,
  categories: Category[],
  options: ApplyCategoryRuleOptions = {},
): ApplyCategoryRuleResult {
  const {
    applyCategory = true,
    applyReminder = true,
    applyRecurrence = true,
  } = options

  let next: CalendarItem = { ...item }
  let appliedCategory = false
  let appliedReminder = false
  let appliedRecurrence = false

  if (applyCategory) {
    next = {
      ...next,
      categoryId: match.category.id,
      colour: resolveItemColour(categories, match.category.id),
      outlookCategories: [match.category.name],
    }
    appliedCategory = true
  }

  if (
    applyReminder &&
    match.automation.reminderLeadDays != null &&
    match.automation.reminderLeadDays > 0
  ) {
    next = {
      ...next,
      ...leadDaysToReminderFields(match.automation.reminderLeadDays),
    }
    appliedReminder = true
  }

  if (applyRecurrence && match.automation.recurrence) {
    const recurrence = categoryRecurrenceToItemRecurrence(match.automation.recurrence)
    if (recurrence) {
      next = {
        ...next,
        recurrence,
        recurringWeekly: recurrence.kind === 'weekly' ? true : undefined,
      }
      appliedRecurrence = true
    }
  }

  return { item: next, appliedCategory, appliedReminder, appliedRecurrence }
}
