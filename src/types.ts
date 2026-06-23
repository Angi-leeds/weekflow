export type CategoryKind = 'event' | 'task' | 'reminder'

export type CalendarViewMode =
  | 'week-list'
  | 'week-board'
  | 'week-timeline'
  | 'day'
  | 'month'
  | 'agenda'
  | 'year'

export type AppSection = 'calendar' | 'planner' | 'board' | 'email' | 'today' | 'settings'

export type ListGroupBy = 'none' | 'category' | 'time' | 'kind'

export type ListSortBy = 'time' | 'alpha'

export interface Category {
  id: string
  name: string
  colour: string
  kind: CategoryKind
  isDefault?: boolean
}

export interface ListDisplayOptions {
  groupBy: ListGroupBy
  sortBy: ListSortBy
  hideCompleted: boolean
  /** When set, only show items in these category ids. null = show all. */
  categoryFilter: string[] | null
}

export const DEFAULT_LIST_OPTIONS: ListDisplayOptions = {
  groupBy: 'none',
  sortBy: 'time',
  hideCompleted: false,
  categoryFilter: null,
}

export const LIST_GROUP_LABELS: Record<ListGroupBy, string> = {
  none: 'No grouping',
  category: 'By category',
  time: 'By time of day',
  kind: 'Events & tasks',
}

export const LIST_SORT_LABELS: Record<ListSortBy, string> = {
  time: 'By time',
  alpha: 'A – Z',
}

export interface CalendarItem {
  id: string
  title: string
  date: string
  endDate?: string
  startTime?: string
  endTime?: string
  allDay: boolean
  categoryId: string
  colour: string
  notes?: string
  completed?: boolean
  /** Resolved photo URL from attachment API (legacy inline base64 fallback). */
  photoUrl?: string
}

export interface EmailAccount {
  id: string
  label: string
  email: string
  provider: string
  colour: string
}

export interface EmailFolder {
  id: string
  label: string
  accountId: string
}

export type EmailInboxMode = 'merged' | 'account' | 'folder'

export interface EmailMessage {
  id: string
  accountId: string
  folderId: string
  from: string
  fromEmail: string
  subject: string
  preview: string
  body: string
  date: string
  unread: boolean
  starred: boolean
  flagged: boolean
  category: string
  labels: string[]
}
