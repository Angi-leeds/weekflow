import type { UserPreferencesDocument } from '../../shared/userPreferences'
import { USER_PREFERENCES_VERSION } from '../../shared/userPreferences'
import type { HouseholdPermissionsConfig } from '../../shared/householdPermissions'
import type {
  CalendarFilter,
  CalendarPreferences,
  CalendarSourcePreferences,
  IntegrationAccountDefaults,
} from '../types'
import {
  loadCalendarPreferences,
  loadCalendarSourcePreferences,
  loadIntegrationAccountDefaults,
  saveCalendarPreferences,
  saveCalendarSourcePreferences,
  saveIntegrationAccountDefaults,
} from './appSettings'
import { loadCalendarFilter, saveCalendarFilter } from './calendarSettings'
import {
  defaultPermissionsConfig,
  loadHouseholdPermissions,
  saveHouseholdPermissions,
} from './householdPermissions'

export const USER_PREFERENCES_CACHE_KEY = 'weekflow-user-preferences-cache'

export interface UserPreferences {
  calendarPreferences: CalendarPreferences
  calendarSourcePreferences: CalendarSourcePreferences
  integrationAccountDefaults: IntegrationAccountDefaults
  householdPermissions: HouseholdPermissionsConfig
  calendarFilter: CalendarFilter
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
  }
}

/** Load Tier-1 settings from server when available; fall back to local cache. */
export async function fetchUserPreferences(): Promise<UserPreferences> {
  try {
    const doc = await apiFetch<UserPreferencesDocument>('/api/user-preferences')
    return applyUserPreferencesDocument(doc)
  } catch {
    const cached = readCachedDocument()
    if (cached) return applyUserPreferencesDocument(cached)
    return loadUserPreferencesFromLocal()
  }
}

/** Persist Tier-1 settings locally and sync to server. */
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
  return {
    calendarPreferences: loadCalendarPreferences(),
    calendarSourcePreferences: loadCalendarSourcePreferences(),
    integrationAccountDefaults: loadIntegrationAccountDefaults(),
    householdPermissions: defaultPermissionsConfig(),
    calendarFilter: loadCalendarFilter(),
  }
}
