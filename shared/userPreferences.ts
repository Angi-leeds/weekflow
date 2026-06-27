/** Versioned household settings document stored in PostgreSQL (jsonb). */
export const USER_PREFERENCES_VERSION = 1;

export interface UserPreferencesDocument {
  version: number;
  calendarPreferences?: unknown;
  calendarSourcePreferences?: unknown;
  integrationAccountDefaults?: unknown;
  householdPermissions?: unknown;
  calendarFilter?: unknown;
}

export function emptyUserPreferencesDocument(): UserPreferencesDocument {
  return { version: USER_PREFERENCES_VERSION };
}
