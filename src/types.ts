export type CategoryKind = 'event' | 'task' | 'reminder'

export type CalendarViewMode =
  | 'week-list'
  | 'week-board'
  | 'week-timeline'
  | 'day'
  | 'month'
  | 'agenda'
  | 'year'

export type AppSection = 'calendar' | 'planner' | 'board' | 'email' | 'contacts' | 'notes' | 'today' | 'settings' | 'super-admin'

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

/** Visual style for event/task cards (week board, lists, planner). */
export type ItemDisplayPreset = 'classic' | 'minimal' | 'dense' | 'bold' | 'custom'

export type ItemCardDensity = 'comfortable' | 'compact' | 'minimal'

export type ItemColorStyle = 'accent-bar' | 'tinted' | 'left-border' | 'dot-only' | 'filled'

export type ItemTimePlacement = 'above-title' | 'inline-title' | 'hidden'

export type ItemTitleSize = 'sm' | 'md' | 'lg'

/** How multi-day all-day events appear in week board / week list. */
export type MultiDayAllDayLayout = 'span-bar' | 'repeat-daily'

export interface ItemDisplayOptions {
  preset: ItemDisplayPreset
  density: ItemCardDensity
  colorStyle: ItemColorStyle
  timePlacement: ItemTimePlacement
  titleSize: ItemTitleSize
  multiDayAllDayLayout: MultiDayAllDayLayout
  showCategoryBadge: boolean
  showNotesPreview: boolean
  showTaskAnytimeLabel: boolean
  showCompletedStrike: boolean
  cardShadow: boolean
  cardBorder: boolean
}

export const DEFAULT_ITEM_DISPLAY: ItemDisplayOptions = {
  preset: 'classic',
  density: 'compact',
  colorStyle: 'accent-bar',
  timePlacement: 'above-title',
  titleSize: 'md',
  multiDayAllDayLayout: 'span-bar',
  showCategoryBadge: true,
  showNotesPreview: true,
  showTaskAnytimeLabel: true,
  showCompletedStrike: true,
  cardShadow: false,
  cardBorder: false,
}

export const ITEM_DISPLAY_PRESET_LABELS: Record<ItemDisplayPreset, string> = {
  classic: 'Classic',
  minimal: 'Minimal',
  dense: 'Dense',
  bold: 'Bold',
  custom: 'Custom',
}

export const ITEM_DENSITY_LABELS: Record<ItemCardDensity, string> = {
  comfortable: 'Comfortable',
  compact: 'Compact',
  minimal: 'Minimal',
}

export const ITEM_COLOR_STYLE_LABELS: Record<ItemColorStyle, string> = {
  'accent-bar': 'Colour bar (left)',
  tinted: 'Soft tint fill',
  'left-border': 'Thick left edge',
  'dot-only': 'Dot only',
  filled: 'Solid fill',
}

export const ITEM_TIME_PLACEMENT_LABELS: Record<ItemTimePlacement, string> = {
  'above-title': 'Above title',
  'inline-title': 'Inline with title',
  hidden: 'Hidden',
}

export const ITEM_TITLE_SIZE_LABELS: Record<ItemTitleSize, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
}

export const MULTI_DAY_ALL_DAY_LAYOUT_LABELS: Record<MultiDayAllDayLayout, string> = {
  'span-bar': 'Stretch across days',
  'repeat-daily': 'Repeat on each day',
}

export const ITEM_DISPLAY_PRESETS: Record<
  Exclude<ItemDisplayPreset, 'custom'>,
  ItemDisplayOptions
> = {
  classic: { ...DEFAULT_ITEM_DISPLAY, preset: 'classic' },
  minimal: {
    preset: 'minimal',
    density: 'minimal',
    colorStyle: 'dot-only',
    timePlacement: 'inline-title',
    titleSize: 'sm',
    multiDayAllDayLayout: 'span-bar',
    showCategoryBadge: false,
    showNotesPreview: false,
    showTaskAnytimeLabel: false,
    showCompletedStrike: true,
    cardShadow: false,
    cardBorder: false,
  },
  dense: {
    preset: 'dense',
    density: 'minimal',
    colorStyle: 'accent-bar',
    timePlacement: 'inline-title',
    titleSize: 'sm',
    multiDayAllDayLayout: 'span-bar',
    showCategoryBadge: false,
    showNotesPreview: false,
    showTaskAnytimeLabel: true,
    showCompletedStrike: true,
    cardShadow: false,
    cardBorder: false,
  },
  bold: {
    preset: 'bold',
    density: 'comfortable',
    colorStyle: 'filled',
    timePlacement: 'above-title',
    titleSize: 'lg',
    multiDayAllDayLayout: 'span-bar',
    showCategoryBadge: true,
    showNotesPreview: true,
    showTaskAnytimeLabel: true,
    showCompletedStrike: true,
    cardShadow: true,
    cardBorder: true,
  },
}

export function applyItemDisplayPreset(preset: Exclude<ItemDisplayPreset, 'custom'>): ItemDisplayOptions {
  return { ...ITEM_DISPLAY_PRESETS[preset] }
}

export type TimeFormat = '12h' | '24h'

export type WeekStartsOn = 0 | 1

export const TIME_FORMAT_LABELS: Record<TimeFormat, string> = {
  '12h': '12 hour',
  '24h': '24 hour',
}

export const WEEK_START_LABELS: Record<WeekStartsOn, string> = {
  0: 'Sunday',
  1: 'Monday',
}

export const DEFAULT_VIEW_LABELS: Record<CalendarViewMode, string> = {
  'week-list': 'Week list',
  'week-board': 'Week board',
  'week-timeline': 'Week timeline',
  day: 'Day',
  month: 'Month',
  agenda: 'Agenda',
  year: 'Year',
}

export const SETTINGS_DEFAULT_VIEWS: CalendarViewMode[] = [
  'week-list',
  'week-board',
  'week-timeline',
  'day',
  'month',
  'agenda',
]

export interface CalendarPreferences {
  defaultView: CalendarViewMode
  weekStartsOn: WeekStartsOn
  timeFormat: TimeFormat
}

export const DEFAULT_CALENDAR_PREFERENCES: CalendarPreferences = {
  defaultView: 'week-list',
  weekStartsOn: 1,
  timeFormat: '24h',
}

export interface IntegrationPreferences {
  googleInterest: boolean
  appleInterest: boolean
  notificationsEnabled: boolean
}

export const DEFAULT_INTEGRATION_PREFERENCES: IntegrationPreferences = {
  googleInterest: false,
  appleInterest: false,
  notificationsEnabled: false,
}

export interface IntegrationAccountDefaults {
  defaultMicrosoftAccountId?: string
  defaultGoogleAccountId?: string
  email?: { defaultAccountId?: string; defaultFolderId?: string }
  calendar?: { defaultAccountId?: string; defaultCalendarId?: string }
  googleCalendar?: { defaultAccountId?: string; defaultCalendarId?: string }
  googleEmail?: { defaultAccountId?: string; defaultLabelId?: string }
  notes?: { defaultAccountId?: string }
  tasks?: { defaultAccountId?: string; defaultTodoListId?: string }
  contacts?: { defaultAccountId?: string }
}

export const DEFAULT_INTEGRATION_ACCOUNT_DEFAULTS: IntegrationAccountDefaults = {}

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
  /** Connected calendar account (mock — mirrors email accounts). */
  accountId: string
  /** Resolved photo URL from attachment API (legacy inline base64 fallback). */
  photoUrl?: string
  /** Microsoft Graph event id when synced. */
  externalId?: string
  provider?: 'microsoft' | 'google' | 'apple' | 'local'
  connectedAccountId?: string
  /** Target Outlook calendar when creating/syncing events. */
  calendarId?: string
  calendarName?: string
  /** Target Microsoft To Do list when creating tasks. */
  todoListId?: string
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
  graphFolderId?: string
  connectedAccountId?: string
  wellKnown?: 'inbox' | 'sentitems' | 'drafts' | 'deleteditems'
}

export type EmailInboxMode = 'merged' | 'account' | 'folder'

export type CalendarFilter =
  | { mode: 'merged' }
  | { mode: 'account'; accountId: string }

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
  externalId?: string
  provider?: 'microsoft' | 'google' | 'apple' | 'mock'
  connectedAccountId?: string
}

export type NoteSource = 'local' | 'mock' | 'microsoft' | 'apple'

export type NotesViewMode = 'icons' | 'list'

export interface Note {
  id: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
  categories?: string[]
  /** Sticky-note accent (Outlook-style yellow by default). */
  colour?: string
  source?: NoteSource
  accountId?: string
  externalId?: string
  connectedAccountId?: string
  provider?: 'microsoft' | 'local' | 'mock'
}

export type ContactSource = 'local' | 'mock' | 'microsoft' | 'household'

export interface Contact {
  id: string
  name: string
  jobTitle?: string
  company?: string
  department?: string
  email?: string
  emailSecondary?: string
  /** Business phone */
  phone?: string
  mobilePhone?: string
  homePhone?: string
  website?: string
  /** Multi-line postal address */
  address?: string
  /** ISO date YYYY-MM-DD */
  birthday?: string
  notes?: string
  categories?: string[]
  starred?: boolean
  household?: boolean
  source?: ContactSource
  externalId?: string
  accountId?: string
  connectedAccountId?: string
}
