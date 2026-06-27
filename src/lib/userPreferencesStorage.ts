import type { UserPreferencesDocument } from '../../shared/userPreferences'
import { USER_PREFERENCES_VERSION } from '../../shared/userPreferences'
import type { HouseholdPermissionsConfig } from '../../shared/householdPermissions'
import type {
  CalendarFilter,
  CalendarPreferences,
  CalendarSourcePreferences,
  IntegrationAccountDefaults,
  IntegrationPreferences,
  ItemDisplayOptions,
  ListDisplayOptions,
  TodayHighlightOptions,
} from '../types'
import {
  loadCalendarPreferences,
  loadCalendarSourcePreferences,
  loadIntegrationAccountDefaults,
  loadIntegrationPreferences,
  loadItemDisplayOptions,
  loadListOptions,
  loadSettingsPanelPreferences,
  loadTodayHighlightOptions,
  saveCalendarPreferences,
  saveCalendarSourcePreferences,
  saveIntegrationAccountDefaults,
  saveIntegrationPreferences,
  saveItemDisplayOptions,
  saveListOptions,
  saveSettingsPanelPreferences,
  saveTodayHighlightOptions,
  type SettingsPanelPreferences,
} from './appSettings'
import { loadBoardSettings, saveBoardSettings, type BoardSettings } from './boardSettings'
import { loadCalendarFilter, saveCalendarFilter } from './calendarSettings'
import {
  loadCalendarNavigation,
  saveCalendarNavigation,
  type CalendarNavigationState,
} from './calendarNavigation'
import {
  loadHouseholdPermissions,
  saveHouseholdPermissions,
} from './householdPermissions'
import {
  loadSettingsSectionState,
  saveSettingsSectionState,
  type SettingsSectionState,
} from './settingsSectionState'

export const USER_PREFERENCES_CACHE_KEY = 'weekflow-user-preferences-cache'

export interface UserPreferences {
  calendarPreferences: CalendarPreferences
  calendarSourcePreferences: CalendarSourcePreferences
  integrationAccountDefaults: IntegrationAccountDefaults
  householdPermissions: HouseholdPermissionsConfig
  calendarFilter: CalendarFilter
  listOptions: ListDisplayOptions
  itemDisplayOptions: ItemDisplayOptions
  todayHighlight: TodayHighlightOptions
  integrationPreferences: IntegrationPreferences
  settingsPanelPreferences: SettingsPanelPreferences
  settingsSectionState: SettingsSectionState
  calendarNavigation: CalendarNavigationState | null
  boardSettings: BoardSettings
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message ?? `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

function cacheDocument(doc: UserPreferencesDocument): void {
  try {
    localStorage.setItem(USER_PREFERENCES_CACHE_KEY, JSON.stringify(doc))
  } catch {
    // ignore quota errors
  }
}

function readCachedDocument(): UserPreferencesDocument | null {
  try {
    const raw = localStorage.getItem(USER_PREFERENCES_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UserPreferencesDocument
  } catch {
    return null
  }
}

function mergePartialJson<T extends object>(current: T, partial: unknown): T {
  if (!partial || typeof partial !== 'object' || Array.isArray(partial)) {
    return current
  }
  return { ...current, ...(partial as Partial<T>) }
}

function parseCalendarNavigation(raw: unknown): CalendarNavigationState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const parsed = raw as Partial<CalendarNavigationState>
  if (typeof parsed.focusDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.focusDate)) {
    return null
  }
  return {
    focusDate: parsed.focusDate,
    viewMode: parsed.viewMode,
  }
}

function parseBoardSettings(raw: unknown): BoardSettings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const parsed = raw as Partial<BoardSettings>
  const layout = parsed.layout
  if (layout !== 'freeform' && layout !== 'kanban' && layout !== 'split') return null
  return {
    layout,
    kanbanGroupBy: parsed.kanbanGroupBy === 'status' ? 'status' : 'people',
    sleepModeEnabled: parsed.sleepModeEnabled === true,
  }
}

function documentNeedsTier3Upgrade(doc: UserPreferencesDocument): boolean {
  return (
    (doc.version ?? 0) < USER_PREFERENCES_VERSION ||
    doc.boardSettings === undefined ||
    doc.listOptions === undefined
  )
}

/** Apply a server document to localStorage using existing validators. */
export function applyUserPreferencesDocument(doc: UserPreferencesDocument): UserPreferences {
  if (doc.calendarPreferences !== undefined) {
    saveCalendarPreferences(
      mergePartialJson(loadCalendarPreferences(), doc.calendarPreferences),
    )
  }
  if (doc.calendarSourcePreferences !== undefined) {
    saveCalendarSourcePreferences(
      mergePartialJson(loadCalendarSourcePreferences(), doc.calendarSourcePreferences),
    )
  }
  if (doc.integrationAccountDefaults !== undefined) {
    saveIntegrationAccountDefaults(
      mergePartialJson(loadIntegrationAccountDefaults(), doc.integrationAccountDefaults),
    )
  }
  if (doc.householdPermissions !== undefined) {
    saveHouseholdPermissions(
      mergePartialJson(loadHouseholdPermissions(), doc.householdPermissions),
    )
  }
  if (doc.calendarFilter !== undefined) {
    saveCalendarFilter(mergePartialJson(loadCalendarFilter(), doc.calendarFilter))
  }
  if (doc.listOptions !== undefined) {
    saveListOptions(mergePartialJson(loadListOptions(), doc.listOptions))
  }
  if (doc.itemDisplayOptions !== undefined) {
    saveItemDisplayOptions(
      mergePartialJson(loadItemDisplayOptions(), doc.itemDisplayOptions),
    )
  }
  if (doc.todayHighlight !== undefined) {
    saveTodayHighlightOptions(
      mergePartialJson(loadTodayHighlightOptions(), doc.todayHighlight),
    )
  }
  if (doc.integrationPreferences !== undefined) {
    saveIntegrationPreferences(
      mergePartialJson(loadIntegrationPreferences(), doc.integrationPreferences),
    )
  }
  if (doc.settingsPanelPreferences !== undefined) {
    saveSettingsPanelPreferences(
      mergePartialJson(loadSettingsPanelPreferences(), doc.settingsPanelPreferences),
    )
  }
  if (doc.settingsSectionState !== undefined) {
    saveSettingsSectionState(
      mergePartialJson(loadSettingsSectionState(), doc.settingsSectionState),
    )
  }
  const calendarNavigation = parseCalendarNavigation(doc.calendarNavigation)
  if (calendarNavigation) {
    saveCalendarNavigation(calendarNavigation)
  }
  const boardSettings = parseBoardSettings(doc.boardSettings)
  if (boardSettings) {
    saveBoardSettings(boardSettings)
  }

  cacheDocument(doc)
  return loadUserPreferencesFromLocal()
}

export function loadUserPreferencesFromLocal(): UserPreferences {
  return {
    calendarPreferences: loadCalendarPreferences(),
    calendarSourcePreferences: loadCalendarSourcePreferences(),
    integrationAccountDefaults: loadIntegrationAccountDefaults(),
    householdPermissions: loadHouseholdPermissions(),
    calendarFilter: loadCalendarFilter(),
    listOptions: loadListOptions(),
    itemDisplayOptions: loadItemDisplayOptions(),
    todayHighlight: loadTodayHighlightOptions(),
    integrationPreferences: loadIntegrationPreferences(),
    settingsPanelPreferences: loadSettingsPanelPreferences(),
    settingsSectionState: loadSettingsSectionState(),
    calendarNavigation: loadCalendarNavigation(),
    boardSettings: loadBoardSettings(),
  }
}

export function buildUserPreferencesDocument(prefs: UserPreferences): UserPreferencesDocument {
  return {
    version: USER_PREFERENCES_VERSION,
    calendarPreferences: prefs.calendarPreferences,
    calendarSourcePreferences: prefs.calendarSourcePreferences,
    integrationAccountDefaults: prefs.integrationAccountDefaults,
    householdPermissions: prefs.householdPermissions,
    calendarFilter: prefs.calendarFilter,
    listOptions: prefs.listOptions,
    itemDisplayOptions: prefs.itemDisplayOptions,
    todayHighlight: prefs.todayHighlight,
    integrationPreferences: prefs.integrationPreferences,
    settingsPanelPreferences: prefs.settingsPanelPreferences,
    settingsSectionState: prefs.settingsSectionState,
    calendarNavigation: prefs.calendarNavigation ?? undefined,
    boardSettings: prefs.boardSettings,
  }
}

/** Load settings from server when available; fall back to local cache. */
export async function fetchUserPreferences(): Promise<UserPreferences> {
  try {
    const doc = await apiFetch<UserPreferencesDocument>('/api/user-preferences')
    const prefs = applyUserPreferencesDocument(doc)
    if (documentNeedsTier3Upgrade(doc)) {
      const local = loadUserPreferencesFromLocal()
      await syncUserPreferences(local)
      return local
    }
    return prefs
  } catch {
    const cached = readCachedDocument()
    if (cached) return applyUserPreferencesDocument(cached)
    return loadUserPreferencesFromLocal()
  }
}

/** Persist settings locally and sync to server. */
export async function syncUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  const doc = buildUserPreferencesDocument(prefs)
  applyUserPreferencesDocument(doc)

  try {
    const saved = await apiFetch<UserPreferencesDocument>('/api/user-preferences', {
      method: 'PUT',
      body: JSON.stringify(doc),
    })
    cacheDocument(saved)
    return applyUserPreferencesDocument(saved)
  } catch (error) {
    console.error('[MyAxis] User preferences server sync failed', error)
    return prefs
  }
}

/** Default bundle for first-time users. */
export function defaultUserPreferences(): UserPreferences {
  return loadUserPreferencesFromLocal()
}
