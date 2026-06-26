import type { DayItemEntry } from './dateUtils'
import type { Category, ListDisplayOptions, ListGroupBy, ListSortBy } from './types'
import { getCategoryName, isTaskCategory } from './categories'
import { isEffectivelyAllDay } from './lib/itemTimeHelpers'

export interface ItemGroup {
  id: string
  label: string
  colour?: string
  entries: DayItemEntry[]
}

type TimeBucket = 'all-day' | 'morning' | 'afternoon' | 'evening' | 'anytime'

const TIME_BUCKET_ORDER: TimeBucket[] = ['all-day', 'morning', 'afternoon', 'evening', 'anytime']

const TIME_BUCKET_LABELS: Record<TimeBucket, string> = {
  'all-day': 'All day',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Tasks & reminders',
}

function getTimeBucket(entry: DayItemEntry, categories: Category[]): TimeBucket {
  const { item } = entry
  if (isEffectivelyAllDay(item, categories)) return 'all-day'
  if (!item.startTime) return 'anytime'
  const h = parseInt(item.startTime.split(':')[0], 10)
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function sortEntries(entries: DayItemEntry[], sortBy: ListSortBy, categories: Category[]): DayItemEntry[] {
  const copy = [...entries]
  if (sortBy === 'alpha') {
    return copy.sort((a, b) => a.item.title.localeCompare(b.item.title))
  }
  return copy.sort((a, b) => {
    const aAll = isEffectivelyAllDay(a.item, categories) ? 0 : 1
    const bAll = isEffectivelyAllDay(b.item, categories) ? 0 : 1
    if (aAll !== bAll) return aAll - bAll
    const aTime = a.item.startTime ?? '99:99'
    const bTime = b.item.startTime ?? '99:99'
    return aTime.localeCompare(bTime)
  })
}

function filterEntries(
  entries: DayItemEntry[],
  options: ListDisplayOptions,
): DayItemEntry[] {
  let result = entries

  if (options.categoryFilter && options.categoryFilter.length > 0) {
    const allowed = new Set(options.categoryFilter)
    result = result.filter((e) => allowed.has(e.item.categoryId))
  }

  if (options.hideCompleted) {
    result = result.filter((e) => !e.item.completed)
  }

  return result
}

function groupByCategory(
  entries: DayItemEntry[],
  categories: Category[],
): ItemGroup[] {
  const map = new Map<string, DayItemEntry[]>()
  for (const entry of entries) {
    const list = map.get(entry.item.categoryId) ?? []
    list.push(entry)
    map.set(entry.item.categoryId, list)
  }

  const groups: ItemGroup[] = []
  for (const cat of categories) {
    const catEntries = map.get(cat.id)
    if (catEntries && catEntries.length > 0) {
      groups.push({
        id: cat.id,
        label: cat.name,
        colour: cat.colour,
        entries: catEntries,
      })
    }
  }

  // Custom categories not in list order, or orphaned ids
  for (const [id, catEntries] of map) {
    if (!groups.some((g) => g.id === id)) {
      groups.push({
        id,
        label: getCategoryName(categories, id),
        colour: catEntries[0]?.item.colour,
        entries: catEntries,
      })
    }
  }

  return groups
}

function groupByTime(entries: DayItemEntry[], categories: Category[]): ItemGroup[] {
  const map = new Map<TimeBucket, DayItemEntry[]>()
  for (const entry of entries) {
    const bucket = getTimeBucket(entry, categories)
    const list = map.get(bucket) ?? []
    list.push(entry)
    map.set(bucket, list)
  }

  return TIME_BUCKET_ORDER.filter((b) => map.has(b)).map((bucket) => ({
    id: bucket,
    label: TIME_BUCKET_LABELS[bucket],
    entries: map.get(bucket)!,
  }))
}

function groupByKind(entries: DayItemEntry[], categories: Category[]): ItemGroup[] {
  const events: DayItemEntry[] = []
  const tasks: DayItemEntry[] = []
  for (const entry of entries) {
    if (isTaskCategory(categories, entry.item.categoryId)) tasks.push(entry)
    else events.push(entry)
  }

  const groups: ItemGroup[] = []
  if (events.length > 0) {
    groups.push({ id: 'events', label: 'Events', colour: '#2D6A6A', entries: events })
  }
  if (tasks.length > 0) {
    groups.push({ id: 'tasks', label: 'Tasks & reminders', colour: '#4A5A9C', entries: tasks })
  }
  return groups
}

export function groupDayItemEntries(
  entries: DayItemEntry[],
  options: ListDisplayOptions,
  categories: Category[],
): ItemGroup[] {
  const filtered = filterEntries(entries, options)
  if (filtered.length === 0) return []

  const sorted = sortEntries(filtered, options.sortBy, categories)

  switch (options.groupBy) {
    case 'category':
      return groupByCategory(sorted, categories).map((g) => ({
        ...g,
        entries: sortEntries(g.entries, options.sortBy, categories),
      }))
    case 'time':
      return groupByTime(sorted, categories).map((g) => ({
        ...g,
        entries: sortEntries(g.entries, options.sortBy, categories),
      }))
    case 'kind':
      return groupByKind(sorted, categories).map((g) => ({
        ...g,
        entries: sortEntries(g.entries, options.sortBy, categories),
      }))
    case 'none':
    default:
      return [{ id: 'all', label: '', entries: sorted }]
  }
}

export function groupByLabel(groupBy: ListGroupBy): string {
  switch (groupBy) {
    case 'category':
      return 'Category'
    case 'time':
      return 'Time of day'
    case 'kind':
      return 'Type'
    default:
      return 'Flat list'
  }
}
