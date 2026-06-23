import { and, eq } from "drizzle-orm";
import type { ItemShare, ShareEntityType, UpsertItemShareInput } from "../../shared/itemShares";
import { DEMO_SHARED_BY } from "../../shared/itemShares";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";
import { getDb } from "../db/index";
import { itemShares } from "../db/schema";

function rowToShare(row: typeof itemShares.$inferSelect): ItemShare {
  return {
    id: row.id,
    householdId: row.householdId,
    itemType: row.itemType as ShareEntityType,
    itemId: row.itemId,
    sharedToBoard: row.sharedToBoard,
    boardDisplay: row.boardDisplay as ItemShare["boardDisplay"],
    sharedBy: row.sharedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listItemShares(): Promise<ItemShare[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(itemShares)
    .where(eq(itemShares.householdId, DEMO_HOUSEHOLD_ID));

  return rows.map(rowToShare);
}

export async function getItemShareForEntity(
  itemType: string,
  itemId: string,
): Promise<ItemShare | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(itemShares)
    .where(
      and(
        eq(itemShares.householdId, DEMO_HOUSEHOLD_ID),
        eq(itemShares.itemType, itemType),
        eq(itemShares.itemId, itemId),
      ),
    )
    .limit(1);

  return row ? rowToShare(row) : null;
}

export async function upsertItemShare(input: UpsertItemShareInput): Promise<ItemShare> {
  const db = getDb();
  if (!db) {
    throw new Error("Database not configured");
  }

  const boardDisplay = input.boardDisplay ?? "title_only";
  const sharedBy = input.sharedBy ?? DEMO_SHARED_BY;

  const [row] = await db
    .insert(itemShares)
    .values({
      householdId: DEMO_HOUSEHOLD_ID,
      itemType: input.itemType,
      itemId: input.itemId,
      sharedToBoard: input.sharedToBoard,
      boardDisplay,
      sharedBy,
    })
    .onConflictDoUpdate({
      target: [itemShares.householdId, itemShares.itemType, itemShares.itemId],
      set: {
        sharedToBoard: input.sharedToBoard,
        boardDisplay,
        sharedBy,
      },
    })
    .returning();

  return rowToShare(row);
}
