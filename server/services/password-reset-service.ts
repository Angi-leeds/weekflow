import { and, eq, isNull, gt } from "drizzle-orm";
import type { Request } from "express";
import { getDb } from "../db/index";
import { passwordResetTokens, users } from "../db/schema";
import { generateSecureToken, sendPasswordResetEmail } from "./email-service";
import { getUserByEmail, getUserById, type DbUser } from "./user-service";

const RESET_TTL_MS = 60 * 60 * 1000;

export async function createPasswordResetToken(
  email: string,
  req?: Request,
): Promise<{ sent: boolean; resetUrl?: string }> {
  const user = await getUserByEmail(email);
  if (!user) {
    return { sent: true };
  }

  const db = getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  const delivery = await sendPasswordResetEmail(req, user.email, token);
  return { sent: true, resetUrl: delivery.delivered ? undefined : delivery.resetUrl };
}

export async function previewPasswordResetToken(token: string): Promise<{
  valid: boolean;
  email?: string;
}> {
  const row = await getValidResetRow(token);
  if (!row) {
    return { valid: false };
  }
  const user = await getUserById(row.userId);
  if (!user) {
    return { valid: false };
  }
  return { valid: true, email: maskEmail(user.email) };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: "password_too_short" };
  }

  const row = await getValidResetRow(token);
  if (!row) {
    return { ok: false, error: "invalid_token" };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "database_unavailable" };
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, row.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));

  return { ok: true };
}

async function getValidResetRow(token: string) {
  const db = getDb();
  if (!db) return null;

  const now = new Date();
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1);

  return row ?? null;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function userHasTotpEnabled(user: DbUser): boolean {
  return Boolean(user.totpEnabled && user.totpSecret);
}
