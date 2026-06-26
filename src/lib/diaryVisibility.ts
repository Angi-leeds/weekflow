import type { CalendarItem, CalendarPreferences, Category } from '../types'
import { getCategoryById } from '../categories'

export function shouldShowInDiary(
  item: CalendarItem,
  categories: Category[],
  prefs: CalendarPreferences,
): boolean {
  const cat = getCategoryById(categories, item.categoryId)
  if (!cat || cat.kind === 'event') return true
  if (!item.date) return false

  const mode = prefs.diaryTasksMode ?? 'category-rules'
  if (mode === 'hide-all-tasks') return false
  if (mode === 'show-all-dated') return cat.kind === 'task' || cat.kind === 'reminder'

  if (item.showInDiary === true) return true
  if (item.showInDiary === false) return false
  return cat.showInDiary ?? false
}

export function filterItemsForDiary(
  items: CalendarItem[],
  categories: Category[],
  prefs: CalendarPreferences,
): CalendarItem[] {
  return items.filter((item) => shouldShowInDiary(item, categories, prefs))
}

export function resolveItemDiaryVisibility(
  item: CalendarItem,
  categories: Category[],
  prefs: CalendarPreferences,
): boolean {
  return shouldShowInDiary(item, categories, prefs)
}

export function categoryDiaryStatusLabel(
  category: Category,
  prefs: CalendarPreferences,
): string {
  if (category.kind === 'event') return 'Appointments only'
  if (prefs.diaryTasksMode === 'hide-all-tasks') return 'Hidden (global setting)'
  if (prefs.diaryTasksMode === 'show-all-dated') return 'On diary when dated'
  return category.showInDiary ? 'On diary when dated' : 'Planner only'
}
