import type { GraphCalendarDto } from '../../shared/microsoftGraph'
import type { GoogleCalendarDto } from '../../shared/googleApi'
import type {
  CalendarFilter,
  CalendarItem,
  CalendarSourceKind,
  CalendarSourcePreferences,
  EmailAccount,
  UnifiedCalendarSource,
} from '../types'
import { MOCK_CALENDAR_SOURCES } from '../mockData'

const KIND_LABELS: Record<CalendarSourceKind, string> = {
  owned: 'My calendars',
  shared: 'Shared with me',
  subscribed: 'Other calendars',
}

export function calendarKindLabel(kind: CalendarSourceKind): string {
  return KIND_LABELS[kind]
}

export function graphCalendarToSource(
  calendar: GraphCalendarDto,
  accountLabel?: string,
): UnifiedCalendarSource {
  return {
    id: calendar.id,
    name: calendar.name,
    accountId: calendar.accountId,
    connectedAccountId: calendar.connectedAccountId,
    provider: 'microsoft',
    providerCalendarId: calendar.graphCalendarId,
    colour: calendar.colour,
    canEdit: calendar.canEdit,
    kind: calendar.kind ?? 'owned',
    isDefault: calendar.isDefault,
    ownerName: calendar.ownerName,
    ownerEmail: calendar.ownerEmail,
    sharedMailboxEmail: calendar.sharedMailboxEmail,
    accountLabel,
  }
}

export function googleCalendarToSource(
  calendar: GoogleCalendarDto,
  accountLabel?: string,
): UnifiedCalendarSource {
  return {
    id: calendar.id,
    name: calendar.name,
    accountId: calendar.accountId,
    connectedAccountId: calendar.connectedAccountId,
    provider: 'google',
    providerCalendarId: calendar.googleCalendarId,
    colour: calendar.colour,
    canEdit: calendar.canEdit,
    kind: calendar.kind ?? 'owned',
    isDefault: calendar.isDefault,
    ownerName: calendar.ownerName,
    ownerEmail: calendar.ownerEmail,
    accountLabel,
  }
}

export function mergeCalendarSources(
  graphCalendars: GraphCalendarDto[],
  googleCalendars: GoogleCalendarDto[],
  calendarAccounts: EmailAccount[],
  usingRealIntegrations: boolean,
): UnifiedCalendarSource[] {
  if (!usingRealIntegrations) {
    return [...MOCK_CALENDAR_SOURCES]
  }

  const accountLabelById = new Map(calendarAccounts.map((account) => [account.id, account.label]))

  return [
    ...graphCalendars.map((calendar) =>
      graphCalendarToSource(calendar, accountLabelById.get(calendar.accountId)),
    ),
    ...googleCalendars.map((calendar) =>
      googleCalendarToSource(calendar, accountLabelById.get(calendar.accountId)),
    ),
  ]
}

export function pruneCalendarSourcePreferences(
  prefs: CalendarSourcePreferences,
  sourceIds: string[],
): CalendarSourcePreferences {
  const valid = new Set(sourceIds)
  return {
    ...prefs,
    enabledCalendarIds: prefs.enabledCalendarIds.filter((id) => valid.has(id)),
    presets: prefs.presets.map((preset) => ({
      ...preset,
      calendarIds: preset.calendarIds.filter((id) => valid.has(id)),
    })),
  }
}

export function enabledCalendarIdSet(
  prefs: CalendarSourcePreferences,
  sources: UnifiedCalendarSource[],
): Set<string> {
  if (prefs.enabledCalendarIds.length === 0) {
    return new Set(sources.map((source) => source.id))
  }
  return new Set(prefs.enabledCalendarIds)
}

export function resolveActiveCalendarIds(
  filter: CalendarFilter,
  prefs: CalendarSourcePreferences,
  sources: UnifiedCalendarSource[],
): Set<string> | null {
  const enabled = enabledCalendarIdSet(prefs, sources)

  if (filter.mode === 'preset') {
    const preset = prefs.presets.find((entry) => entry.id === filter.presetId)
    if (!preset) return enabled
    const presetIds = preset.calendarIds.filter((id) => enabled.has(id))
    return new Set(presetIds)
  }

  if (filter.mode === 'account') {
    const accountIds = new Set(
      sources.filter((source) => source.accountId === filter.accountId).map((source) => source.id),
    )
    return new Set([...enabled].filter((id) => accountIds.has(id)))
  }

  return enabled
}

export function isMicrosoftTodoTask(item: CalendarItem): boolean {
  return item.id.startsWith('graph-todo-') || Boolean(item.todoListId && !item.calendarId)
}

export function resolveItemCalendarSourceId(
  item: CalendarItem,
  sources: UnifiedCalendarSource[],
): string | null {
  if (!item.calendarId) return null
  const match = sources.find((source) => source.providerCalendarId === item.calendarId)
  return match?.id ?? null
}

export function calendarFilterMatchesItem(
  filter: CalendarFilter,
  item: CalendarItem,
  prefs: CalendarSourcePreferences,
  sources: UnifiedCalendarSource[],
): boolean {
  if (isMicrosoftTodoTask(item)) {
    return prefs.showMicrosoftTodoTasks
  }

  const activeIds = resolveActiveCalendarIds(filter, prefs, sources)
  if (!activeIds) return true

  const sourceId = resolveItemCalendarSourceId(item, sources)
  if (sourceId) {
    return activeIds.has(sourceId)
  }

  if (filter.mode === 'account') {
    return item.accountId === filter.accountId
  }

  if (!item.provider || item.provider === 'local' || item.provider === 'mock') {
    const mockMatch = sources.find(
      (source) => source.accountId === item.accountId && activeIds.has(source.id),
    )
    if (mockMatch && item.calendarId) {
      return item.calendarId === mockMatch.providerCalendarId
    }
    return sources.some((source) => source.accountId === item.accountId && activeIds.has(source.id))
  }

  return activeIds.size === sources.length
}

export function groupSourcesByAccountAndKind(sources: UnifiedCalendarSource[]) {
  const accounts = new Map<
    string,
    { label: string; groups: Map<CalendarSourceKind, UnifiedCalendarSource[]> }
  >()

  for (const source of sources) {
    const label = source.accountLabel ?? source.accountId
    const entry = accounts.get(source.accountId) ?? { label, groups: new Map() }
    const group = entry.groups.get(source.kind) ?? []
    group.push(source)
    entry.groups.set(source.kind, group)
    accounts.set(source.accountId, entry)
  }

  return accounts
}
