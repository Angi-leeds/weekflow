import type { Category, CategoryKind } from './types'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'holiday', name: 'Holiday', colour: '#3D8B5F', kind: 'event', isDefault: true },
  { id: 'work', name: 'Work', colour: '#C45C4A', kind: 'event', isDefault: true },
  { id: 'appointment', name: 'Appointment', colour: '#2D6A6A', kind: 'event', isDefault: true },
  { id: 'family', name: 'Family', colour: '#7C5CBF', kind: 'event', isDefault: true },
  { id: 'personal', name: 'Personal', colour: '#30A0B0', kind: 'event', isDefault: true },
  { id: 'task', name: 'Task', colour: '#4A5A9C', kind: 'task', isDefault: true, showInDiary: false },
  { id: 'reminder', name: 'Reminder', colour: '#C47832', kind: 'reminder', isDefault: true, showInDiary: true },
]

export function defaultShowInDiaryForKind(kind: CategoryKind): boolean | undefined {
  if (kind === 'reminder') return true
  if (kind === 'task') return false
  return undefined
}

export function migrateCategories(categories: Category[]): Category[] {
  return categories.map((cat) => ({
    ...cat,
    showInDiary:
      cat.showInDiary ?? defaultShowInDiaryForKind(cat.kind),
  }))
}

export const COLOUR_PRESETS = [
  '#2D6A6A',
  '#C45C4A',
  '#4A5A9C',
  '#3D8B5F',
  '#7C5CBF',
  '#C47832',
  '#30A0B0',
  '#B84A6A',
  '#6B5B4A',
  '#5856D6',
  '#1A1A1A',
  '#8E8E93',
]

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  event: 'Event',
  task: 'Task',
  reminder: 'Reminder',
}

export function getCategoryById(categories: Category[], id: string): Category | undefined {
  return categories.find((c) => c.id === id)
}

export function getCategoryColour(categories: Category[], id: string): string {
  return getCategoryById(categories, id)?.colour ?? '#8E8E93'
}

export function getCategoryName(categories: Category[], id: string): string {
  return getCategoryById(categories, id)?.name ?? 'Unknown'
}

export function isTaskCategory(categories: Category[], categoryId: string): boolean {
  const cat = getCategoryById(categories, categoryId)
  return cat?.kind === 'task' || cat?.kind === 'reminder'
}

export function resolveItemColour(categories: Category[], categoryId: string): string {
  return getCategoryColour(categories, categoryId)
}

/** Map legacy type slugs to default category ids for mock data. */
export function legacyTypeToCategoryId(type: string): string {
  const known = DEFAULT_CATEGORIES.find((c) => c.id === type)
  return known ? known.id : DEFAULT_CATEGORIES[0].id
}

export function generateCategoryId(name: string, existing: Category[]): string {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'category'
  let id = base
  let n = 1
  while (existing.some((c) => c.id === id)) {
    id = `${base}-${n++}`
  }
  return id
}

export const CATEGORIES_STORAGE_KEY = 'weekflow-categories'

export function loadStoredCategories(): Category[] | null {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Category[]
    return Array.isArray(parsed) && parsed.length > 0 ? migrateCategories(parsed) : null
  } catch {
    return null
  }
}

export function saveStoredCategories(categories: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
  } catch {
    // ignore quota errors in prototype
  }
}
