import type { CalendarItem, CalendarSourcePreferences, Category } from '../types'
import { TODO_SECTION_LABEL } from '../branding'
import { isTaskCategory } from '../categories'
import { isMicrosoftTodoTask } from './calendarSources'

/** Where a task is stored and synced from. */
export type TaskProvider = 'microsoft' | 'google' | 'apple' | 'local'

export const TASK_PROVIDER_LABELS: Record<TaskProvider, string> = {
  microsoft: 'Microsoft To Do',
  google: 'Google Tasks',
  apple: 'iCloud Reminders',
  local: 'MyAxis (local)',
}

/** Shown next to the calendar visibility toggle — To Do list is unaffected. */
export const TASK_PROVIDER_CALENDAR_TOGGLE_DESCRIPTIONS: Record<TaskProvider, string> = {
  microsoft: `Show dated tasks on the calendar. They always stay in ${TODO_SECTION_LABEL}.`,
  google: `Show dated tasks on the calendar. They always stay in ${TODO_SECTION_LABEL}.`,
  apple: `Show dated reminders on the calendar. They always stay in ${TODO_SECTION_LABEL}.`,
  local: `Show dated tasks on the calendar. They always stay in ${TODO_SECTION_LABEL}.`,
}

export function connectedTaskListLabels(options: {
  usingRealMicrosoft: boolean
  usingRealGoogle: boolean
  usingRealApple: boolean
}): string[] {
  const labels: string[] = []
  if (options.usingRealMicrosoft) labels.push(TASK_PROVIDER_LABELS.microsoft)
  if (options.usingRealGoogle) labels.push(TASK_PROVIDER_LABELS.google)
  if (options.usingRealApple) labels.push(TASK_PROVIDER_LABELS.apple)
  return labels
}

export function plannerSubtitle(taskListLabel: string | undefined, open: number, done: number): string {
  const counts = `${open} open · ${done} done`
  return taskListLabel ? `${taskListLabel} · ${counts}` : counts
}

/** Sentinel category id used for provider-backed tasks in the item model. */
export const PROVIDER_TASK_CATEGORY_ID = 'task'

export function getTaskProvider(item: CalendarItem): TaskProvider | null {
  if (isMicrosoftTodoTask(item)) return 'microsoft'
  if (item.id.startsWith('google-task-')) return 'google'
  if (item.id.startsWith('icloud-reminder-')) return 'apple'
  if (
    item.categoryId === 'task' ||
    item.categoryId === 'reminder' ||
    item.provider === 'local' ||
    item.provider === 'mock' ||
    !item.provider
  ) {
    if (item.externalId && item.provider === 'google') return 'google'
    if (item.externalId && item.provider === 'apple') return 'apple'
    if (!item.externalId && !isMicrosoftTodoTask(item)) return 'local'
  }
  return null
}

export function isProviderBackedTask(item: CalendarItem): boolean {
  const provider = getTaskProvider(item)
  return provider !== null && provider !== 'local'
}

export function isAnyTaskItem(item: CalendarItem, categories: Category[]): boolean {
  if (isProviderBackedTask(item)) return true
  if (isTaskCategory(categories, item.categoryId)) return true
  return item.categoryId === PROVIDER_TASK_CATEGORY_ID || item.categoryId === 'reminder'
}

/** Hide demo/local tasks once a real account is connected. */
export function isLocalOnlyTask(item: CalendarItem): boolean {
  if (isProviderBackedTask(item)) return false
  if (item.externalId) return false
  if (item.provider && item.provider !== 'local' && item.provider !== 'mock') return false
  return (
    item.categoryId === PROVIDER_TASK_CATEGORY_ID ||
    item.categoryId === 'reminder' ||
    Boolean(item.todoListId && !item.calendarId)
  )
}

export function getTaskSourceLabel(item: CalendarItem, categories: Category[]): string {
  const provider = getTaskProvider(item)
  if (provider && provider !== 'local') return TASK_PROVIDER_LABELS[provider]
  if (isTaskCategory(categories, item.categoryId)) {
    const cat = categories.find((entry) => entry.id === item.categoryId)
    return cat?.name ?? 'Task'
  }
  return 'Task'
}

export function providerTaskShowsOnDiary(
  item: CalendarItem,
  prefs: CalendarSourcePreferences,
  diaryTasksMode: 'category-rules' | 'hide-all-tasks' | 'show-all-dated',
): boolean {
  if (!item.date) return false
  if (diaryTasksMode === 'hide-all-tasks') return false
  if (diaryTasksMode === 'show-all-dated') return true

  if (item.showInDiary === true) return true
  if (item.showInDiary === false) return false

  const provider = getTaskProvider(item)
  if (provider === 'microsoft') return prefs.showMicrosoftTodoTasks
  // Future providers get their own prefs; until then, dated tasks stay off diary.
  if (provider === 'google' || provider === 'apple') return false

  return false
}
