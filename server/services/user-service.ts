import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import type { AuthUser } from "../../shared/auth";
import {
  canRegisterEmail,
  normalizeEmail,
  shouldBeSuperAdmin,
} from "../config/auth-config";
import { getDb } from "../db/index";
import { users } from "../db/schema";
import { consumeHouseholdInvite, previewHouseholdInvite } from "./invite-service";
import {
  buildOtpAuthUrl,
  generateTotpSecret,
  verifyTotpCode,
} from "./totp-service";

const BCRYPT_ROUNDS = 12;

export type DbUser = typeof users.$inferSelect;

function toAuthUser(row: DbUser): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    isSuperAdmin: row.isSuperAdmin,
    totpEnabled: row.totpEnabled,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function countUsers(): Promise<number> {
  const db = getDb();
  if (!db) {
    return 0;
  }

  const result = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  return result[0]?.count ?? 0;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const db = getDb();
  if (!db) {
    return null;
  }

  const normalized = normalizeEmail(email);
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function listUsers(): Promise<AuthUser[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  const rows = await db.select().from(users).orderBy(users.createdAt);
  return rows.map(toAuthUser);
}

export async function verifyUserPassword(
  email: string,
  password: string,
): Promise<DbUser | null> {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  return match ? user : null;
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName?: string;
  inviteToken?: string;
}): Promise<{ user?: AuthUser; error?: string }> {
  const db = getDb();
  if (!db) {
    return { error: "database_unavailable" };
  }

  const email = normalizeEmail(input.email);
  const password = input.password;
  if (!password || password.length < 8) {
    return { error: "password_too_short" };
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return { error: "email_taken" };
  }

  const userCount = await countUsers();
  if (input.inviteToken) {
    const preview = await previewHouseholdInvite(input.inviteToken);
    if (!preview.valid || preview.email !== email) {
      return { error: "invalid_invite" };
    }
  } else {
    const signupCheck = canRegisterEmail(email, userCount);
    if (!signupCheck.allowed) {
      return { error: signupCheck.reason ?? "signup_closed" };
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const displayName = input.displayName?.trim() || email.split("@")[0] || email;
  const isSuperAdmin = shouldBeSuperAdmin(email) || userCount === 0;

  const inserted = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      displayName,
      isSuperAdmin,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    return { error: "register_failed" };
  }

  if (input.inviteToken) {
    await consumeHouseholdInvite(input.inviteToken, email);
  }

  return { user: toAuthUser(row) };
}

export async function beginTotpSetup(userId: string): Promise<{ secret: string; otpauthUrl: string } | null> {
  const db = getDb();
  const user = await getUserById(userId);
  if (!db || !user) return null;

  const secret = user.totpSecret ?? generateTotpSecret();
  if (!user.totpSecret) {
    await db.update(users).set({ totpSecret: secret, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  return {
    secret,
    otpauthUrl: buildOtpAuthUrl(user.email, secret),
  };
}

export async function enableTotp(userId: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getUserById(userId);
  if (!user?.totpSecret) {
    return { ok: false, error: "totp_not_started" };
  }
  if (!verifyTotpCode(user.totpSecret, code)) {
    return { ok: false, error: "invalid_code" };
  }

  const db = getDb();
  if (!db) return { ok: false, error: "database_unavailable" };

  await db
    .update(users)
    .set({ totpEnabled: true, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { ok: true };
}

export async function disableTotp(
  userId: string,
  password: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getUserById(userId);
  if (!user) return { ok: false, error: "user_not_found" };

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return { ok: false, error: "invalid_password" };

  if (!user.totpSecret || !verifyTotpCode(user.totpSecret, code)) {
    return { ok: false, error: "invalid_code" };
  }

  const db = getDb();
  if (!db) return { ok: false, error: "database_unavailable" };

  await db
    .update(users)
    .set({ totpEnabled: false, totpSecret: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { ok: true };
}

export async function verifyUserTotp(userId: string, code: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user?.totpEnabled || !user.totpSecret) return false;
  return verifyTotpCode(user.totpSecret, code);
}

export function serializeUserForSession(user: DbUser): AuthUser {
  return toAuthUser(user);
}
