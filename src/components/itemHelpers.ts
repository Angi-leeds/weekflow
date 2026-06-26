import type { CalendarItem, Category } from '../types'
import { isAnyTaskItem } from '../lib/providerTasks'

export function isTaskOrReminder(item: CalendarItem, categories: Category[]): boolean {
  return isAnyTaskItem(item, categories)
}

export function isEditableTask(item: { categoryId: string }, categories: Category[]): boolean {
  return isTaskOrReminder(item, categories)
}
