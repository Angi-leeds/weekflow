import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import type {
  BoardPin,
  CreateBoardPinInput,
  CreateVoicePinInput,
  UpdateBoardPinInput,
  UpdateBoardPinPositionInput,
} from "../../shared/boardPins";
import type { VoicePinContent } from "../../shared/boardLayout";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";
import { getDb } from "../db/index";
import { boardPins } from "../db/schema";

function rowToPin(row: typeof boardPins.$inferSelect): BoardPin {
  return {
    id: row.id,
    householdId: row.householdId,
    itemType: row.itemType as BoardPin["itemType"],
    itemId: row.itemId,
    x: row.x,
    y: row.y,
    rotation: row.rotation,
    pinStyle: row.pinStyle,
    contentJson: (row.contentJson as Record<string, unknown> | null) ?? null,
    dismissedAt: row.dismissedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listBoardPins(): Promise<BoardPin[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(boardPins)
    .where(
      and(eq(boardPins.householdId, DEMO_HOUSEHOLD_ID), isNull(boardPins.dismissedAt)),
    );

  return rows.map(rowToPin);
}

export async function getBoardPinForItem(
  itemType: string,
  itemId: string,
): Promise<BoardPin | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(boardPins)
    .where(
      and(
        eq(boardPins.householdId, DEMO_HOUSEHOLD_ID),
        eq(boardPins.itemType, itemType),
        eq(boardPins.itemId, itemId),
      ),
    )
    .limit(1);

  return row ? rowToPin(row) : null;
}

export async function createBoardPin(input: CreateBoardPinInput): Promise<BoardPin> {
  const db = getDb();
  if (!db) {
    throw new Error("Database not configured");
  }

  const existing = await getBoardPinForItem(input.itemType, input.itemId);
  if (existing) return existing;

  const [row] = await db
    .insert(boardPins)
    .values({
      householdId: DEMO_HOUSEHOLD_ID,
      itemType: input.itemType,
      itemId: input.itemId,
      x: input.x ?? Math.random() * 60 + 10,
      y: input.y ?? Math.random() * 50 + 15,
      rotation: input.rotation ?? (Math.random() - 0.5) * 8,
      pinStyle: input.pinStyle ?? null,
    })
    .returning();

  return rowToPin(row);
}

export async function updateBoardPinPosition(
  id: string,
  input: UpdateBoardPinPositionInput,
): Promise<BoardPin | null> {
  return updateBoardPin(id, input);
}

export async function updateBoardPin(
  id: string,
  input: UpdateBoardPinInput,
): Promise<BoardPin | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .update(boardPins)
    .set({
      ...(input.x !== undefined ? { x: input.x } : {}),
      ...(input.y !== undefined ? { y: input.y } : {}),
      ...(input.rotation !== undefined ? { rotation: input.rotation } : {}),
      ...(input.pinStyle !== undefined ? { pinStyle: input.pinStyle } : {}),
      ...(input.contentJson !== undefined ? { contentJson: input.contentJson } : {}),
      ...(input.dismissedAt !== undefined
        ? { dismissedAt: input.dismissedAt ? new Date(input.dismissedAt) : null }
        : {}),
    })
    .where(and(eq(boardPins.id, id), eq(boardPins.householdId, DEMO_HOUSEHOLD_ID)))
    .returning();

  return row ? rowToPin(row) : null;
}

export async function createVoiceBoardPin(input: CreateVoicePinInput): Promise<BoardPin> {
  const db = getDb();
  const contentJson: VoicePinContent = {
    kind: "voice",
    message: input.message,
    from: input.from ?? "Mum",
    durationSec: Math.max(3, Math.round(input.message.length / 8)),
    played: false,
    replies: [],
  };

  const fallback: BoardPin = {
    id: randomUUID(),
    householdId: DEMO_HOUSEHOLD_ID,
    itemType: null,
    itemId: null,
    x: Math.random() * 60 + 20,
    y: Math.random() * 50 + 20,
    rotation: 0,
    pinStyle: input.pinStyle ?? "🎙️",
    contentJson,
    dismissedAt: null,
    createdAt: new Date().toISOString(),
  };

  if (!db) return fallback;

  const [row] = await db
    .insert(boardPins)
    .values({
      householdId: DEMO_HOUSEHOLD_ID,
      itemType: null,
      itemId: null,
      x: fallback.x,
      y: fallback.y,
      rotation: 0,
      pinStyle: fallback.pinStyle,
      contentJson,
    })
    .returning();

  return rowToPin(row);
}
