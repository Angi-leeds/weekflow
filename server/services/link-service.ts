import { and, eq, or } from "drizzle-orm";
import type { CreateLinkInput, ItemLink } from "../../shared/links";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";
import { getDb } from "../db/index";
import { links } from "../db/schema";

function rowToLink(row: typeof links.$inferSelect): ItemLink {
  return {
    id: row.id,
    householdId: row.householdId,
    fromType: row.fromType as ItemLink["fromType"],
    fromId: row.fromId,
    toType: row.toType as ItemLink["toType"],
    toId: row.toId,
    kind: row.kind as ItemLink["kind"],
    folderUrl: row.folderUrl,
    folderProvider: row.folderProvider,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listLinks(): Promise<ItemLink[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(links)
    .where(eq(links.householdId, DEMO_HOUSEHOLD_ID));

  return rows.map(rowToLink);
}

export async function getLinksForEntity(
  entityType: string,
  entityId: string,
): Promise<ItemLink[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(links)
    .where(
      and(
        eq(links.householdId, DEMO_HOUSEHOLD_ID),
        or(
          and(eq(links.fromType, entityType), eq(links.fromId, entityId)),
          and(eq(links.toType, entityType), eq(links.toId, entityId)),
        ),
      ),
    );

  return rows.map(rowToLink);
}

export async function createLink(input: CreateLinkInput): Promise<ItemLink> {
  const db = getDb();
  if (!db) {
    throw new Error("Database not configured");
  }

  const [row] = await db
    .insert(links)
    .values({
      householdId: DEMO_HOUSEHOLD_ID,
      fromType: input.fromType,
      fromId: input.fromId,
      toType: input.toType,
      toId: input.toId,
      kind: input.kind,
      folderUrl: input.folderUrl,
      folderProvider: input.folderProvider,
    })
    .returning();

  return rowToLink(row);
}

export async function deleteLink(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const result = await db
    .delete(links)
    .where(and(eq(links.id, id), eq(links.householdId, DEMO_HOUSEHOLD_ID)));

  return (result.rowCount ?? 0) > 0;
}
