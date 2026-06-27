import { eq } from "drizzle-orm";
import type { CategoryAutomationMap } from "../../shared/categoryAutomation";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";
import { getDb } from "../db/index";
import { householdCategoryAutomation } from "../db/schema";

function emptyMap(): CategoryAutomationMap {
  return {};
}

function normalizeMap(raw: unknown): CategoryAutomationMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyMap();
  }
  return raw as CategoryAutomationMap;
}

export async function getCategoryAutomationMap(): Promise<CategoryAutomationMap> {
  const db = getDb();
  if (!db) return emptyMap();

  const rows = await db
    .select()
    .from(householdCategoryAutomation)
    .where(eq(householdCategoryAutomation.householdId, DEMO_HOUSEHOLD_ID))
    .limit(1);

  return normalizeMap(rows[0]?.rulesJson);
}

export async function saveCategoryAutomationMap(
  map: CategoryAutomationMap,
): Promise<CategoryAutomationMap> {
  const db = getDb();
  if (!db) {
    throw new Error("Database not configured");
  }

  const normalized = normalizeMap(map);
  const now = new Date();

  await db
    .insert(householdCategoryAutomation)
    .values({
      householdId: DEMO_HOUSEHOLD_ID,
      rulesJson: normalized,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: householdCategoryAutomation.householdId,
      set: {
        rulesJson: normalized,
        updatedAt: now,
      },
    });

  return normalized;
}
