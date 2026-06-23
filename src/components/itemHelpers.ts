import type { Category } from '../types'
import { isTaskCategory } from '../categories'

export function isTaskOrReminder(item: { categoryId: string }, categories: Category[]): boolean {
  return isTaskCategory(categories, item.categoryId)
}

export function isEditableTask(item: { categoryId: string }, categories: Category[]): boolean {
  return isTaskOrReminder(item, categories)
}
