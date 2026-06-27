/** Household-scoped content synced across devices (Tier 2). */
export const HOUSEHOLD_LOCAL_DATA_VERSION = 1;

export interface HouseholdLocalDataDocument {
  version: number;
  localNotes?: unknown;
  contactOverlays?: unknown;
  localCategories?: unknown;
}

export function emptyHouseholdLocalDataDocument(): HouseholdLocalDataDocument {
  return { version: HOUSEHOLD_LOCAL_DATA_VERSION };
}
