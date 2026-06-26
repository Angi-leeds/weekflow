const STORAGE_KEY = 'weekflow-settings-sections'

export type SettingsSectionId =
  | 'account'
  | 'connected-accounts'
  | 'connected-advanced'
  | 'sync-matrix'
  | 'calendar-tasks'
  | 'calendar-help'
  | 'display'
  | 'display-advanced'
  | 'household'
  | 'about'

export const DEFAULT_SETTINGS_SECTION_OPEN: Record<SettingsSectionId, boolean> = {
  account: true,
  'connected-accounts': true,
  'connected-advanced': false,
  'sync-matrix': false,
  'calendar-tasks': true,
  'calendar-help': false,
  display: true,
  'display-advanced': false,
  household: true,
  about: false,
}

export type SettingsSectionState = Partial<Record<SettingsSectionId, boolean>>

export function loadSettingsSectionState(): SettingsSectionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as SettingsSectionState
  } catch {
    return {}
  }
}

export function saveSettingsSectionState(state: SettingsSectionState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function isSettingsSectionOpen(
  id: SettingsSectionId,
  state: SettingsSectionState,
): boolean {
  if (state[id] !== undefined) return state[id] === true
  return DEFAULT_SETTINGS_SECTION_OPEN[id]
}

export function setSettingsSectionOpen(
  state: SettingsSectionState,
  id: SettingsSectionId,
  open: boolean,
): SettingsSectionState {
  return { ...state, [id]: open }
}
