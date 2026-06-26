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
  /** When true, dated tasks/reminders in this category appear on the calendar diary. */
  showInDiary?: boolean
  /** Outlook master category Graph id (when synced). */
  outlookGraphId?: string
  /** Outlook colour preset name e.g. preset7. */
  outlookPreset?: string
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

import type { ItemReminderPreset } from '../../shared/reminders'

export type { ItemReminderPreset }

export const ITEM_REMINDER_PRESET_LABELS: Record<ItemReminderPreset, string> = {
  none: 'No reminder',
  'at-time': 'At time of event',
  '5min': '5 minutes before',
  '15min': '15 minutes before',
  '30min': '30 minutes before',
  '1hour': '1 hour before',
  '2hours': '2 hours before',
  '4hours': '4 hours before',
  '1day': '1 day before',
  '2days': '2 days before',
  '3days': '3 days before',
  '1week': '1 week before',
  custom: 'Custom offset…',
  datetime: 'Specific date & time…',
}

export type ItemTitleSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export const ITEM_TITLE_SIZE_OPTIONS: ItemTitleSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']

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
  xs: 'Extra small',
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
  xl: 'Extra large',
  '2xl': 'Extra extra large',
}

export function getItemTitleSizeClass(size: ItemTitleSize): string {
  switch (size) {
    case 'xs':
      return 'text-[10px]'
    case 'sm':
      return 'text-[11px]'
    case 'md':
      return 'text-[12px]'
    case 'lg':
      return 'text-[14px]'
    case 'xl':
      return 'text-[16px]'
    case '2xl':
      return 'text-[18px]'
    default:
      return 'text-[12px]'
  }
}

/** Time labels sit one step below the chosen title size. */
export function getItemTimeSizeClass(size: ItemTitleSize): string {
  const index = ITEM_TITLE_SIZE_OPTIONS.indexOf(size)
  const timeSize = index > 0 ? ITEM_TITLE_SIZE_OPTIONS[index - 1]! : size
  return getItemTitleSizeClass(timeSize)
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
    titleSize: 'xl',
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

/** Where the week view window starts when opening the app or tapping Today. */
export type WeekViewAnchor = 'week-start' | 'today'

export const TIME_FORMAT_LABELS: Record<TimeFormat, string> = {
  '12h': '12 hour',
  '24h': '24 hour',
}

export const WEEK_START_LABELS: Record<WeekStartsOn, string> = {
  0: 'Sunday',
  1: 'Monday',
}

export const WEEK_VIEW_ANCHOR_LABELS: Record<WeekViewAnchor, string> = {
  'week-start': 'Start of week',
  today: 'Today onwards',
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

export type DiaryTasksMode = 'category-rules' | 'hide-all-tasks' | 'show-all-dated'

export const DIARY_TASKS_MODE_OPTIONS: DiaryTasksMode[] = [
  'category-rules',
  'hide-all-tasks',
  'show-all-dated',
]

export const DIARY_TASKS_MODE_LABELS: Record<DiaryTasksMode, string> = {
  'category-rules': 'Use category rules',
  'hide-all-tasks': 'Hide all tasks from diary',
  'show-all-dated': 'Show all dated tasks',
}

export const DIARY_TASKS_MODE_DESCRIPTIONS: Record<DiaryTasksMode, string> = {
  'category-rules':
    'Recommended. Each list below controls whether dated tasks show on your diary.',
  'hide-all-tasks': 'Events and reminders only — a clean diary. Tasks stay in To Do.',
  'show-all-dated':
    'Every task with a date appears on the diary. Good if you want everything visible.',
}

export interface CalendarPreferences {
  defaultView: CalendarViewMode
  weekStartsOn: WeekStartsOn
  timeFormat: TimeFormat
  /** When true, month view week rows grow to show every event instead of "+N more". */
  monthViewExpandWeeks: boolean
  /** Default left edge of the 7-day rolling week view window. */
  weekViewAnchor: WeekViewAnchor
  /** How dated tasks appear on the calendar diary (To Do always shows all tasks). */
  diaryTasksMode?: DiaryTasksMode
  /** Show ISO week number on the left of day headers. */
  showWeekNumber?: boolean
  /** Show day-of-year number on the left of day headers. */
  showDayOfYear?: boolean
}

export const DEFAULT_CALENDAR_PREFERENCES: CalendarPreferences = {
  defaultView: 'week-list',
  weekStartsOn: 1,
  timeFormat: '24h',
  monthViewExpandWeeks: false,
  weekViewAnchor: 'week-start',
  diaryTasksMode: 'category-rules',
  showWeekNumber: false,
  showDayOfYear: false,
}

export interface DateHeaderDisplayOptions {
  showWeekNumber: boolean
  showDayOfYear: boolean
}

export const DEFAULT_DATE_HEADER_DISPLAY: DateHeaderDisplayOptions = {
  showWeekNumber: false,
  showDayOfYear: false,
}

export function dateHeaderDisplayFromPreferences(
  prefs: CalendarPreferences,
): DateHeaderDisplayOptions {
  return {
    showWeekNumber: prefs.showWeekNumber === true,
    showDayOfYear: prefs.showDayOfYear === true,
  }
}

/** Visual preset for highlighting the current day across calendar views. */
export type TodayHighlightPreset =
  | 'subtle'
  | 'bold'
  | 'outline'
  | 'pill'
  | 'pulse-soft'
  | 'pulse-strong'
  | 'left-bar'
  | 'dashed-frame'
  | 'high-contrast'
  | 'minimal-dot'
  | 'custom'

export type TodayBackgroundMode = 'none' | 'soft' | 'strong' | 'solid'

export type TodayBorderMode = 'none' | 'ring' | 'full' | 'left-bar' | 'dashed' | 'double'

export type TodayDateStyle =
  | 'default'
  | 'accent-text'
  | 'filled-circle'
  | 'filled-pill'
  | 'outlined-circle'
  | 'scaled'

export type TodayPulseMode = 'off' | 'soft' | 'strong' | 'glow'

export type TodayBadgeMode = 'none' | 'pill' | 'dot' | 'label' | 'corner'

export interface TodayHighlightOptions {
  preset: TodayHighlightPreset
  accentColor: string
  backgroundMode: TodayBackgroundMode
  /** 10–100 — opacity of tint/solid fills */
  backgroundOpacity: number
  borderMode: TodayBorderMode
  borderWidth: 1 | 2 | 3 | 4
  dateStyle: TodayDateStyle
  pulse: TodayPulseMode
  badge: TodayBadgeMode
  /** Tint the full day column in week board / list columns */
  tintColumn: boolean
  /** Tint the whole month grid cell behind today */
  tintMonthCell: boolean
  /** Colour the weekday label (Mon, Tue…) on today */
  showWeekdayAccent: boolean
}

export const TODAY_HIGHLIGHT_PRESET_LABELS: Record<TodayHighlightPreset, string> = {
  subtle: 'Subtle tint',
  bold: 'Bold (default)',
  outline: 'Outline frame',
  pill: 'Date pill only',
  'pulse-soft': 'Gentle pulse',
  'pulse-strong': 'Strong pulse',
  'left-bar': 'Left accent bar',
  'dashed-frame': 'Dashed frame',
  'high-contrast': 'High contrast',
  'minimal-dot': 'Dot marker',
  custom: 'Custom',
}

export const TODAY_BACKGROUND_LABELS: Record<TodayBackgroundMode, string> = {
  none: 'None',
  soft: 'Soft tint',
  strong: 'Strong tint',
  solid: 'Solid fill',
}

export const TODAY_BORDER_LABELS: Record<TodayBorderMode, string> = {
  none: 'None',
  ring: 'Rounded ring',
  full: 'Full border',
  'left-bar': 'Left bar only',
  dashed: 'Dashed border',
  double: 'Double border',
}

export const TODAY_DATE_STYLE_LABELS: Record<TodayDateStyle, string> = {
  default: 'Same as other days',
  'accent-text': 'Accent colour text',
  'filled-circle': 'Filled circle',
  'filled-pill': 'Filled pill',
  'outlined-circle': 'Outlined circle',
  scaled: 'Larger number',
}

export const TODAY_PULSE_LABELS: Record<TodayPulseMode, string> = {
  off: 'Off',
  soft: 'Soft pulse',
  strong: 'Strong pulse',
  glow: 'Glow pulse',
}

export const TODAY_BADGE_LABELS: Record<TodayBadgeMode, string> = {
  none: 'Hidden',
  pill: 'Today pill',
  dot: 'Dot only',
  label: 'TODAY text',
  corner: 'Corner ribbon',
}

export const TODAY_COLOR_SWATCHES = [
  '#2d6a6a',
  '#c45c4a',
  '#4a5a9c',
  '#3d8b5f',
  '#c47832',
  '#7c5cbf',
  '#1a1918',
  '#0078d4',
] as const

export const DEFAULT_TODAY_HIGHLIGHT: TodayHighlightOptions = {
  preset: 'bold',
  accentColor: '#2d6a6a',
  backgroundMode: 'soft',
  backgroundOpacity: 50,
  borderMode: 'none',
  borderWidth: 2,
  dateStyle: 'accent-text',
  pulse: 'off',
  badge: 'pill',
  tintColumn: true,
  tintMonthCell: true,
  showWeekdayAccent: true,
}

type TodayPresetBundle = Omit<TodayHighlightOptions, 'preset' | 'accentColor'>

export const TODAY_HIGHLIGHT_PRESETS: Record<Exclude<TodayHighlightPreset, 'custom'>, TodayPresetBundle> = {
  subtle: {
    backgroundMode: 'soft',
    backgroundOpacity: 35,
    borderMode: 'none',
    borderWidth: 2,
    dateStyle: 'accent-text',
    pulse: 'off',
    badge: 'none',
    tintColumn: true,
    tintMonthCell: true,
    showWeekdayAccent: true,
  },
  bold: {
    backgroundMode: 'soft',
    backgroundOpacity: 50,
    borderMode: 'none',
    borderWidth: 2,
    dateStyle: 'accent-text',
    pulse: 'off',
    badge: 'pill',
    tintColumn: true,
    tintMonthCell: true,
    showWeekdayAccent: true,
  },
  outline: {
    backgroundMode: 'none',
    backgroundOpacity: 50,
    borderMode: 'ring',
    borderWidth: 2,
    dateStyle: 'accent-text',
    pulse: 'off',
    badge: 'none',
    tintColumn: false,
    tintMonthCell: true,
    showWeekdayAccent: true,
  },
  pill: {
    backgroundMode: 'none',
    backgroundOpacity: 50,
    borderMode: 'none',
    borderWidth: 2,
    dateStyle: 'filled-circle',
    pulse: 'off',
    badge: 'none',
    tintColumn: false,
    tintMonthCell: true,
    showWeekdayAccent: false,
  },
  'pulse-soft': {
    backgroundMode: 'soft',
    backgroundOpacity: 45,
    borderMode: 'ring',
    borderWidth: 2,
    dateStyle: 'filled-circle',
    pulse: 'soft',
    badge: 'dot',
    tintColumn: true,
    tintMonthCell: true,
    showWeekdayAccent: true,
  },
  'pulse-strong': {
    backgroundMode: 'strong',
    backgroundOpacity: 65,
    borderMode: 'full',
    borderWidth: 3,
    dateStyle: 'scaled',
    pulse: 'strong',
    badge: 'label',
    tintColumn: true,
    tintMonthCell: true,
    showWeekdayAccent: true,
  },
  'left-bar': {
    backgroundMode: 'soft',
    backgroundOpacity: 40,
    borderMode: 'left-bar',
    borderWidth: 4,
    dateStyle: 'accent-text',
    pulse: 'off',
    badge: 'none',
    tintColumn: true,
    tintMonthCell: true,
    showWeekdayAccent: true,
  },
  'dashed-frame': {
    backgroundMode: 'none',
    backgroundOpacity: 50,
    borderMode: 'dashed',
    borderWidth: 2,
    dateStyle: 'outlined-circle',
    pulse: 'off',
    badge: 'none',
    tintColumn: false,
    tintMonthCell: true,
    showWeekdayAccent: true,
  },
  'high-contrast': {
    backgroundMode: 'solid',
    backgroundOpacity: 100,
    borderMode: 'full',
    borderWidth: 2,
    dateStyle: 'filled-pill',
    pulse: 'glow',
    badge: 'label',
    tintColumn: true,
    tintMonthCell: true,
    showWeekdayAccent: true,
  },
  'minimal-dot': {
    backgroundMode: 'none',
    backgroundOpacity: 50,
    borderMode: 'none',
    borderWidth: 2,
    dateStyle: 'default',
    pulse: 'off',
    badge: 'dot',
    tintColumn: false,
    tintMonthCell: true,
    showWeekdayAccent: false,
  },
}

export function applyTodayHighlightPreset(
  preset: Exclude<TodayHighlightPreset, 'custom'>,
  accentColor = DEFAULT_TODAY_HIGHLIGHT.accentColor,
): TodayHighlightOptions {
  return {
    preset,
    accentColor,
    ...TODAY_HIGHLIGHT_PRESETS[preset],
  }
}

export type ItemShowInDiaryMode = 'category' | 'always' | 'never'

export interface SaveItemOptions {
  createLinkedTask?: { categoryId: string }
  createLinkedCalendarEvent?: { categoryId: string }
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
  emailSignature?: string
  sharedMailboxEmail?: string
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
  attendees?: string[]
  recurringWeekly?: boolean
  teamsMeeting?: boolean
  onlineMeetingUrl?: string
  inviteResponse?: 'accepted' | 'declined' | 'tentativelyAccepted' | 'none'
  /** When to remind — relative offset or specific datetime. */
  reminderPreset?: ItemReminderPreset
  /** Minutes before start when reminderPreset is 'custom'. */
  reminderCustomMinutes?: number
  /** Local datetime (YYYY-MM-DDTHH:mm) when reminderPreset is 'datetime'. */
  reminderAt?: string
  /** null = follow category; true/false = pin to diary or hide from diary. */
  showInDiary?: boolean | null
  /** Outlook category names assigned on the Graph event. */
  outlookCategories?: string[]
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
  parentFolderId?: string
}

export interface EmailAttachment {
  id: string
  name: string
  contentType?: string
  size?: number
  isInline?: boolean
  contentId?: string
}

export type EmailInboxMode = 'merged' | 'account' | 'folder'

export type CalendarFilter =
  | { mode: 'merged' }
  | { mode: 'preset'; presetId: string }
  | { mode: 'account'; accountId: string }

export type CalendarSourceKind = 'owned' | 'shared' | 'subscribed'

export interface CalendarSourcePreset {
  id: string
  label: string
  calendarIds: string[]
}

export interface CalendarSourcePreferences {
  /** Composite calendar source ids; empty = all calendars enabled. */
  enabledCalendarIds: string[]
  showMicrosoftTodoTasks: boolean
  presets: CalendarSourcePreset[]
}

export const DEFAULT_CALENDAR_SOURCE_PRESETS: CalendarSourcePreset[] = [
  { id: 'work', label: 'Work set', calendarIds: [] },
  { id: 'personal', label: 'Personal set', calendarIds: [] },
]

export const DEFAULT_CALENDAR_SOURCE_PREFERENCES: CalendarSourcePreferences = {
  enabledCalendarIds: [],
  showMicrosoftTodoTasks: true,
  presets: DEFAULT_CALENDAR_SOURCE_PRESETS,
}

export interface UnifiedCalendarSource {
  id: string
  name: string
  accountId: string
  connectedAccountId: string
  provider: 'microsoft' | 'google' | 'mock'
  providerCalendarId: string
  colour?: string
  canEdit?: boolean
  kind: CalendarSourceKind
  isDefault?: boolean
  ownerName?: string
  ownerEmail?: string
  sharedMailboxEmail?: string
  accountLabel?: string
}

export interface EmailMessage {
  id: string
  accountId: string
  folderId: string
  from: string
  fromEmail: string
  subject: string
  preview: string
  body: string
  bodyContentType?: 'html' | 'text'
  date: string
  unread: boolean
  starred: boolean
  flagged: boolean
  category: string
  labels: string[]
  externalId?: string
  provider?: 'microsoft' | 'google' | 'apple' | 'mock'
  connectedAccountId?: string
  hasAttachments?: boolean
  attachmentCount?: number
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
