import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { Request } from "express";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";
import { normalizeEmail } from "../config/auth-config";
import { getDb } from "../db/index";
import { householdInvites } from "../db/schema";
import { buildAppLink, generateSecureToken, sendInviteEmail } from "./email-service";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createHouseholdInvite(input: {
  email: string;
  invitedBy: string;
  displayName?: string;
  req?: Request;
}): Promise<{ invite: typeof householdInvites.$inferSelect; inviteUrl: string; delivered: boolean }> {
  const db = getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const email = normalizeEmail(input.email);
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const [invite] = await db
    .insert(householdInvites)
    .values({
      email,
      token,
      invitedBy: input.invitedBy,
      displayName: input.displayName?.trim() || undefined,
      householdId: DEMO_HOUSEHOLD_ID,
      expiresAt,
    })
    .returning();

  const delivery = await sendInviteEmail(input.req, email, token);
  return {
    invite,
    inviteUrl: delivery.inviteUrl,
    delivered: delivery.delivered,
  };
}

export async function listHouseholdInvites(): Promise<
  Array<{
    id: string;
    email: string;
    token: string;
    displayName?: string;
    inviteUrl: string;
    expiresAt: string;
    acceptedAt?: string;
    createdAt: string;
  }>
> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(householdInvites)
    .orderBy(desc(householdInvites.createdAt));

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    token: row.token,
    displayName: row.displayName ?? undefined,
    inviteUrl: buildAppLink(undefined, `/?invite=${encodeURIComponent(row.token)}`),
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function revokeHouseholdInvite(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const result = await db.delete(householdInvites).where(eq(householdInvites.id, id));
  return (result.rowCount ?? 0) > 0;
}

export async function previewHouseholdInvite(token: string): Promise<{
  valid: boolean;
  email?: string;
  displayName?: string;
}> {
  const row = await getValidInviteRow(token);
  if (!row) {
    return { valid: false };
  }
  return {
    valid: true,
    email: row.email,
    displayName: row.displayName ?? undefined,
  };
}

export async function consumeHouseholdInvite(
  token: string,
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const row = await getValidInviteRow(token);
  if (!row) {
    return { ok: false, error: "invalid_invite" };
  }

  if (normalizeEmail(email) !== row.email) {
    return { ok: false, error: "invite_email_mismatch" };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "database_unavailable" };
  }

  await db
    .update(householdInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(householdInvites.id, row.id));

  return { ok: true };
}

async function getValidInviteRow(token: string) {
  const db = getDb();
  if (!db) return null;

  const now = new Date();
  const [row] = await db
    .select()
    .from(householdInvites)
    .where(
      and(
        eq(householdInvites.token, token),
        isNull(householdInvites.acceptedAt),
        gt(householdInvites.expiresAt, now),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function isInviteTokenValid(token: string): Promise<boolean> {
  const row = await getValidInviteRow(token);
  return Boolean(row);
}
