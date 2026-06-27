import type { CategoryAutomation, CategoryAutomationMap } from '../../shared/categoryAutomation'
import { DEFAULT_CATEGORY_AUTOMATION } from '../../shared/categoryAutomation'

export const CATEGORY_AUTOMATION_STORAGE_KEY = 'weekflow-category-automation'

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

export function loadCategoryAutomationMap(): CategoryAutomationMap {
  try {
    const raw = localStorage.getItem(CATEGORY_AUTOMATION_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CategoryAutomationMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveCategoryAutomationMap(map: CategoryAutomationMap): void {
  try {
    localStorage.setItem(CATEGORY_AUTOMATION_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore quota errors
  }
}

/** Load rules from server when available; fall back to this browser's cache. */
export async function fetchCategoryAutomationMap(): Promise<CategoryAutomationMap> {
  try {
    const map = await apiFetch<CategoryAutomationMap>('/api/category-automation')
    saveCategoryAutomationMap(map)
    return map
  } catch {
    return loadCategoryAutomationMap()
  }
}

/** Persist rules locally and sync to server (household account). */
export async function syncCategoryAutomationMap(map: CategoryAutomationMap): Promise<CategoryAutomationMap> {
  saveCategoryAutomationMap(map)
  try {
    return await apiFetch<CategoryAutomationMap>('/api/category-automation', {
      method: 'PUT',
      body: JSON.stringify(map),
    })
  } catch (error) {
    console.error('[MyAxis] Category rules server sync failed', error)
    return map
  }
}

export function getCategoryAutomation(
  map: CategoryAutomationMap,
  categoryId: string,
): CategoryAutomation | undefined {
  const entry = map[categoryId]
  if (!entry?.enabled) return undefined
  return entry
}

export function persistCategoryAutomation(
  categoryId: string,
  automation: CategoryAutomation | null | undefined,
  currentMap?: CategoryAutomationMap,
): CategoryAutomationMap {
  const map = { ...(currentMap ?? loadCategoryAutomationMap()) }
  if (!automation?.enabled || automation.keywords.length === 0) {
    delete map[categoryId]
  } else {
    map[categoryId] = {
      ...DEFAULT_CATEGORY_AUTOMATION,
      ...automation,
      keywords: automation.keywords.map((k) => k.trim()).filter(Boolean),
    }
  }
  saveCategoryAutomationMap(map)
  return map
}

export async function persistAndSyncCategoryAutomation(
  categoryId: string,
  automation: CategoryAutomation | null | undefined,
  currentMap?: CategoryAutomationMap,
): Promise<CategoryAutomationMap> {
  const map = persistCategoryAutomation(categoryId, automation, currentMap)
  return syncCategoryAutomationMap(map)
}

export function removeCategoryAutomation(
  categoryId: string,
  currentMap?: CategoryAutomationMap,
): CategoryAutomationMap {
  const map = { ...(currentMap ?? loadCategoryAutomationMap()) }
  delete map[categoryId]
  saveCategoryAutomationMap(map)
  return map
}

export async function removeAndSyncCategoryAutomation(
  categoryId: string,
  currentMap?: CategoryAutomationMap,
): Promise<CategoryAutomationMap> {
  const map = removeCategoryAutomation(categoryId, currentMap)
  return syncCategoryAutomationMap(map)
}
