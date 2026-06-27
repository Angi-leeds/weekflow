import { eq } from "drizzle-orm";
import {
  USER_PREFERENCES_VERSION,
  emptyUserPreferencesDocument,
  type UserPreferencesDocument,
} from "../../shared/userPreferences";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";
import { getDb } from "../db/index";
import { householdUserPreferences } from "../db/schema";

function normalizeDocument(raw: unknown): UserPreferencesDocument {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyUserPreferencesDocument();
  }
  const doc = raw as Partial<UserPreferencesDocument>;
  return {
    version: typeof doc.version === "number" ? doc.version : USER_PREFERENCES_VERSION,
    calendarPreferences: doc.calendarPreferences,
    calendarSourcePreferences: doc.calendarSourcePreferences,
    integrationAccountDefaults: doc.integrationAccountDefaults,
    householdPermissions: doc.householdPermissions,
    calendarFilter: doc.calendarFilter,
    listOptions: doc.listOptions,
    itemDisplayOptions: doc.itemDisplayOptions,
    todayHighlight: doc.todayHighlight,
    integrationPreferences: doc.integrationPreferences,
    settingsPanelPreferences: doc.settingsPanelPreferences,
    settingsSectionState: doc.settingsSectionState,
    calendarNavigation: doc.calendarNavigation,
    boardSettings: doc.boardSettings,
  };
}

export async function getUserPreferencesDocument(): Promise<UserPreferencesDocument> {
  const db = getDb();
  if (!db) return emptyUserPreferencesDocument();

  const rows = await db
    .select()
    .from(householdUserPreferences)
    .where(eq(householdUserPreferences.householdId, DEMO_HOUSEHOLD_ID))
    .limit(1);

  return normalizeDocument(rows[0]?.prefsJson);
}

export async function saveUserPreferencesDocument(
  doc: UserPreferencesDocument,
): Promise<UserPreferencesDocument> {
  const db = getDb();
  if (!db) {
    throw new Error("Database not configured");
  }

  const normalized = normalizeDocument({ ...doc, version: USER_PREFERENCES_VERSION });
  const now = new Date();

  await db
    .insert(householdUserPreferences)
    .values({
      householdId: DEMO_HOUSEHOLD_ID,
      prefsJson: normalized,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: householdUserPreferences.householdId,
      set: {
        prefsJson: normalized,
        updatedAt: now,
      },
    });

  return normalized;
}

export function documentNeedsTier3Upgrade(doc: UserPreferencesDocument): boolean {
  return (
    (doc.version ?? 0) < USER_PREFERENCES_VERSION ||
    doc.boardSettings === undefined ||
    doc.listOptions === undefined
  );
}
