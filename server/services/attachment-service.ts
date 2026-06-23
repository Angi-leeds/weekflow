import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import type {
  Attachment,
  AttachmentEntityType,
  AttachmentKind,
  CreateAttachmentInput,
} from "../../shared/attachments";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";
import { getDb } from "../db/index";
import { attachments } from "../db/schema";
import { attachmentPublicUrl } from "./storage-service";

function rowToAttachment(row: typeof attachments.$inferSelect): Attachment {
  return {
    id: row.id,
    householdId: row.householdId,
    itemType: row.itemType as AttachmentEntityType,
    itemId: row.itemId,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    filename: row.filename,
    kind: row.kind as AttachmentKind,
    url: attachmentPublicUrl(row.storageKey),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAttachments(): Promise<Attachment[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(attachments)
    .where(eq(attachments.householdId, DEMO_HOUSEHOLD_ID));

  return rows.map(rowToAttachment);
}

export async function listAttachmentsForItem(
  itemType: string,
  itemId: string,
): Promise<Attachment[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.householdId, DEMO_HOUSEHOLD_ID),
        eq(attachments.itemType, itemType),
        eq(attachments.itemId, itemId),
      ),
    );

  return rows.map(rowToAttachment);
}

export async function createAttachment(input: CreateAttachmentInput): Promise<Attachment> {
  const db = getDb();
  const base: Attachment = {
    id: randomUUID(),
    householdId: DEMO_HOUSEHOLD_ID,
    itemType: input.itemType,
    itemId: input.itemId,
    storageKey: input.storageKey,
    mimeType: input.mimeType,
    filename: input.filename,
    kind: input.kind,
    url: attachmentPublicUrl(input.storageKey),
    createdAt: new Date().toISOString(),
  };

  if (!db) return base;

  const [row] = await db
    .insert(attachments)
    .values({
      householdId: DEMO_HOUSEHOLD_ID,
      itemType: input.itemType,
      itemId: input.itemId,
      storageKey: input.storageKey,
      mimeType: input.mimeType,
      filename: input.filename,
      kind: input.kind,
    })
    .returning();

  return rowToAttachment(row);
}

export async function getAttachmentById(id: string): Promise<Attachment | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.householdId, DEMO_HOUSEHOLD_ID)))
    .limit(1);

  return row ? rowToAttachment(row) : null;
}

export function getPhotoUrlForItem(
  attachmentList: Attachment[],
  itemType: AttachmentEntityType,
  itemId: string,
): string | undefined {
  return attachmentList.find(
    (entry) =>
      entry.itemType === itemType &&
      entry.itemId === itemId &&
      entry.kind === "photo",
  )?.url;
}
