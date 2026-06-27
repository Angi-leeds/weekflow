import { eq } from "drizzle-orm";
import {
  HOUSEHOLD_LOCAL_DATA_VERSION,
  emptyHouseholdLocalDataDocument,
  type HouseholdLocalDataDocument,
} from "../../shared/householdLocalData";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";
import { getDb } from "../db/index";
import { householdLocalData } from "../db/schema";

function normalizeDocument(raw: unknown): HouseholdLocalDataDocument {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyHouseholdLocalDataDocument();
  }
  const doc = raw as Partial<HouseholdLocalDataDocument>;
  return {
    version: typeof doc.version === "number" ? doc.version : HOUSEHOLD_LOCAL_DATA_VERSION,
    localNotes: doc.localNotes,
    contactOverlays: doc.contactOverlays,
    localCategories: doc.localCategories,
  };
}

export async function getHouseholdLocalDataDocument(): Promise<HouseholdLocalDataDocument> {
  const db = getDb();
  if (!db) return emptyHouseholdLocalDataDocument();

  const rows = await db
    .select()
    .from(householdLocalData)
    .where(eq(householdLocalData.householdId, DEMO_HOUSEHOLD_ID))
    .limit(1);

  return normalizeDocument(rows[0]?.dataJson);
}

export async function saveHouseholdLocalDataDocument(
  doc: HouseholdLocalDataDocument,
): Promise<HouseholdLocalDataDocument> {
  const db = getDb();
  if (!db) {
    throw new Error("Database not configured");
  }

  const normalized = normalizeDocument({
    ...doc,
    version: HOUSEHOLD_LOCAL_DATA_VERSION,
  });
  const now = new Date();

  await db
    .insert(householdLocalData)
    .values({
      householdId: DEMO_HOUSEHOLD_ID,
      dataJson: normalized,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: householdLocalData.householdId,
      set: {
        dataJson: normalized,
        updatedAt: now,
      },
    });

  return normalized;
}

export function isEmptyHouseholdLocalDataDocument(doc: HouseholdLocalDataDocument): boolean {
  const notes = Array.isArray(doc.localNotes) ? doc.localNotes : [];
  const overlays =
    doc.contactOverlays && typeof doc.contactOverlays === "object" && !Array.isArray(doc.contactOverlays)
      ? Object.keys(doc.contactOverlays as Record<string, unknown>)
      : [];
  const categories = Array.isArray(doc.localCategories) ? doc.localCategories : [];
  return notes.length === 0 && overlays.length === 0 && categories.length === 0;
}
