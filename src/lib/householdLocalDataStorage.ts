import type { HouseholdLocalDataDocument } from '../../shared/householdLocalData'
import { HOUSEHOLD_LOCAL_DATA_VERSION } from '../../shared/householdLocalData'
import {
  DEFAULT_CATEGORIES,
  migrateCategories,
  loadStoredCategories,
  saveStoredCategories,
} from '../categories'
import type { Category, Note } from '../types'
import type { ContactOverlay } from './contacts'
import {
  extractSyncableLocalNotes,
  isSyncableLocalNote,
  loadStoredNotes,
  saveStoredNotes,
} from './notes'
import { loadContactOverlays, saveContactOverlays } from './contacts'

export const HOUSEHOLD_LOCAL_DATA_CACHE_KEY = 'weekflow-household-local-data-cache'

export interface HouseholdLocalData {
  localNotes: Note[]
  contactOverlays: Record<string, ContactOverlay>
  localCategories: Category[]
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

function cacheDocument(doc: HouseholdLocalDataDocument): void {
  try {
    localStorage.setItem(HOUSEHOLD_LOCAL_DATA_CACHE_KEY, JSON.stringify(doc))
  } catch {
    // ignore quota errors
  }
}

function readCachedDocument(): HouseholdLocalDataDocument | null {
  try {
    const raw = localStorage.getItem(HOUSEHOLD_LOCAL_DATA_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as HouseholdLocalDataDocument
  } catch {
    return null
  }
}

function parseNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (entry): entry is Note =>
      Boolean(entry) &&
      typeof entry === 'object' &&
      typeof (entry as Note).id === 'string' &&
      typeof (entry as Note).title === 'string',
  )
}

function parseContactOverlays(raw: unknown): Record<string, ContactOverlay> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as Record<string, ContactOverlay>
}

function parseCategories(raw: unknown): Category[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  return migrateCategories(raw as Category[])
}

export function loadHouseholdLocalDataFromLocal(): HouseholdLocalData {
  const storedNotes = loadStoredNotes() ?? []
  const storedCategories = loadStoredCategories()
  return {
    localNotes: extractSyncableLocalNotes(storedNotes),
    contactOverlays: loadContactOverlays(),
    localCategories: migrateCategories(storedCategories ?? DEFAULT_CATEGORIES),
  }
}

function documentHasContent(doc: HouseholdLocalDataDocument): boolean {
  const notes = parseNotes(doc.localNotes)
  const overlays = parseContactOverlays(doc.contactOverlays)
  const categories = parseCategories(doc.localCategories)
  return notes.length > 0 || Object.keys(overlays).length > 0 || categories.length > 0
}

function localHasContent(data: HouseholdLocalData): boolean {
  if (data.localNotes.length > 0) return true
  if (Object.keys(data.contactOverlays).length > 0) return true
  return loadStoredCategories() !== null
}

/** Apply a server document to localStorage caches. */
export function applyHouseholdLocalDataDocument(
  doc: HouseholdLocalDataDocument,
): HouseholdLocalData {
  const data: HouseholdLocalData = {
    localNotes: parseNotes(doc.localNotes),
    contactOverlays: parseContactOverlays(doc.contactOverlays),
    localCategories: parseCategories(doc.localCategories),
  }

  saveStoredNotes(data.localNotes)
  saveContactOverlays(data.contactOverlays)
  if (data.localCategories.length > 0) {
    saveStoredCategories(data.localCategories)
  }

  cacheDocument(doc)
  return data
}

export function buildHouseholdLocalDataDocument(data: HouseholdLocalData): HouseholdLocalDataDocument {
  return {
    version: HOUSEHOLD_LOCAL_DATA_VERSION,
    localNotes: data.localNotes,
    contactOverlays: data.contactOverlays,
    localCategories: data.localCategories,
  }
}

export function mergeLocalNotesIntoNotes(currentNotes: Note[], localNotes: Note[]): Note[] {
  const preserved = currentNotes.filter((note) => !isSyncableLocalNote(note))
  return [...preserved, ...localNotes]
}

/** Load Tier-2 content from server; migrate existing browser data on first sync. */
export async function fetchHouseholdLocalData(): Promise<HouseholdLocalData> {
  try {
    const doc = await apiFetch<HouseholdLocalDataDocument>('/api/household-local-data')
    if (!documentHasContent(doc)) {
      const local = loadHouseholdLocalDataFromLocal()
      if (localHasContent(local)) {
        await syncHouseholdLocalData(local)
        return local
      }
    }
    return applyHouseholdLocalDataDocument(doc)
  } catch {
    const cached = readCachedDocument()
    if (cached) return applyHouseholdLocalDataDocument(cached)
    return loadHouseholdLocalDataFromLocal()
  }
}

/** Persist Tier-2 content locally and sync to server. */
export async function syncHouseholdLocalData(data: HouseholdLocalData): Promise<HouseholdLocalData> {
  const doc = buildHouseholdLocalDataDocument(data)
  applyHouseholdLocalDataDocument(doc)

  try {
    const saved = await apiFetch<HouseholdLocalDataDocument>('/api/household-local-data', {
      method: 'PUT',
      body: JSON.stringify(doc),
    })
    cacheDocument(saved)
    return applyHouseholdLocalDataDocument(saved)
  } catch (error) {
    console.error('[MyAxis] Household local data server sync failed', error)
    return data
  }
}

export function collectHouseholdLocalData(input: {
  notes: Note[]
  contactOverlays: Record<string, ContactOverlay>
  localCategories: Category[]
}): HouseholdLocalData {
  return {
    localNotes: extractSyncableLocalNotes(input.notes),
    contactOverlays: input.contactOverlays,
    localCategories: input.localCategories,
  }
}
