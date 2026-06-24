import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db/index";
import { authChallenges } from "../db/schema";
import { generateSecureToken } from "./email-service";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function createLoginChallenge(userId: string): Promise<string> {
  const db = getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const token = generateSecureToken(24);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await db.delete(authChallenges).where(eq(authChallenges.userId, userId));
  await db.insert(authChallenges).values({
    token,
    userId,
    kind: "totp_login",
    expiresAt,
  });

  return token;
}

export async function consumeLoginChallenge(token: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const now = new Date();
  const [row] = await db
    .select()
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.token, token),
        eq(authChallenges.kind, "totp_login"),
        gt(authChallenges.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) return null;

  await db.delete(authChallenges).where(eq(authChallenges.token, token));
  return row.userId;
}
