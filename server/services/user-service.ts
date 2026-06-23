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

const BCRYPT_ROUNDS = 12;

export type DbUser = typeof users.$inferSelect;

function toAuthUser(row: DbUser): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    isSuperAdmin: row.isSuperAdmin,
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
  const signupCheck = canRegisterEmail(email, userCount);
  if (!signupCheck.allowed) {
    return { error: signupCheck.reason ?? "signup_closed" };
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

  return { user: toAuthUser(row) };
}

export function serializeUserForSession(user: DbUser): AuthUser {
  return toAuthUser(user);
}
