/** Versioned household settings document stored in PostgreSQL (jsonb). */
export const USER_PREFERENCES_VERSION = 2;

export interface UserPreferencesDocument {
  version: number;
  /** Tier 1 */
  calendarPreferences?: unknown;
  calendarSourcePreferences?: unknown;
  integrationAccountDefaults?: unknown;
  householdPermissions?: unknown;
  calendarFilter?: unknown;
  /** Tier 3 — display, board layout, navigation */
  listOptions?: unknown;
  itemDisplayOptions?: unknown;
  todayHighlight?: unknown;
  integrationPreferences?: unknown;
  settingsPanelPreferences?: unknown;
  settingsSectionState?: unknown;
  calendarNavigation?: unknown;
  boardSettings?: unknown;
}

export function emptyUserPreferencesDocument(): UserPreferencesDocument {
  return { version: USER_PREFERENCES_VERSION };
}
