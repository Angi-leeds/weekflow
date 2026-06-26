import type {
  CalendarItem,
  CalendarPreferences,
  CalendarSourcePreferences,
  Category,
} from '../types'
import { getCategoryById } from '../categories'
import { TODO_SECTION_LABEL } from '../branding'
import {
  getTaskProvider,
  isProviderBackedTask,
  providerTaskShowsOnDiary,
} from './providerTasks'

export function shouldShowInDiary(
  item: CalendarItem,
  categories: Category[],
  prefs: CalendarPreferences,
  sourcePrefs?: CalendarSourcePreferences,
): boolean {
  const mode = prefs.diaryTasksMode ?? 'category-rules'

  if (isProviderBackedTask(item)) {
    if (!sourcePrefs) return mode !== 'hide-all-tasks' && Boolean(item.date)
    return providerTaskShowsOnDiary(item, sourcePrefs, mode)
  }

  const cat = getCategoryById(categories, item.categoryId)
  if (!cat || cat.kind === 'event') return true
  if (!item.date) return false

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
  sourcePrefs?: CalendarSourcePreferences,
): CalendarItem[] {
  return items.filter((item) => shouldShowInDiary(item, categories, prefs, sourcePrefs))
}

export function resolveItemDiaryVisibility(
  item: CalendarItem,
  categories: Category[],
  prefs: CalendarPreferences,
  sourcePrefs?: CalendarSourcePreferences,
): boolean {
  return shouldShowInDiary(item, categories, prefs, sourcePrefs)
}

export function providerTaskDiaryStatusLabel(
  provider: NonNullable<ReturnType<typeof getTaskProvider>>,
  prefs: CalendarPreferences,
  sourcePrefs: CalendarSourcePreferences,
): string {
  if (provider === 'local') return 'Local only — not synced'
  if (prefs.diaryTasksMode === 'hide-all-tasks') return 'Hidden (global setting)'
  if (prefs.diaryTasksMode === 'show-all-dated') return 'On diary when dated'
  if (provider === 'microsoft') {
    return sourcePrefs.showMicrosoftTodoTasks
      ? 'On calendar when dated'
      : `${TODO_SECTION_LABEL} only — hidden from calendar`
  }
  return 'Not available yet'
}

export function categoryDiaryStatusLabel(
  category: Category,
  prefs: CalendarPreferences,
): string {
  if (category.kind === 'event') return 'Appointments only'
  if (prefs.diaryTasksMode === 'hide-all-tasks') return 'Hidden (global setting)'
  if (prefs.diaryTasksMode === 'show-all-dated') return 'On diary when dated'
  return category.showInDiary ? 'On diary when dated' : `${TODO_SECTION_LABEL} only`
}
