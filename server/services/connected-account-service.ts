import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { and, eq } from "drizzle-orm";
import type { GoogleConnectedAccountPublic } from "../../shared/googleApi";
import type { ConnectedAccountPublic } from "../../shared/microsoftGraph";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";
import { getDb } from "../db/index";
import { connectedAccounts, providerItemMappings } from "../db/schema";

export type IntegrationProvider = "microsoft" | "google";

const LOCAL_DIR = path.resolve(
  process.env.LOCAL_CONNECTED_ACCOUNTS_DIR ||
    path.join(process.cwd(), ".local-connected-accounts"),
);

export interface ConnectedAccountRecord {
  id: string;
  householdId: string;
  provider: IntegrationProvider;
  providerAccountId: string;
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderItemMappingRecord {
  id: string;
  householdId: string;
  connectedAccountId: string;
  itemType: "calendar" | "email" | "task";
  localItemId: string;
  externalId: string;
  provider: IntegrationProvider;
  createdAt: string;
}

function toMicrosoftPublic(record: ConnectedAccountRecord): ConnectedAccountPublic {
  return {
    id: record.id,
    provider: "microsoft",
    email: record.email,
    displayName: record.displayName,
    providerAccountId: record.providerAccountId,
    connectedAt: record.createdAt,
  };
}

function toGooglePublic(record: ConnectedAccountRecord): GoogleConnectedAccountPublic {
  return {
    id: record.id,
    provider: "google",
    email: record.email,
    displayName: record.displayName,
    providerAccountId: record.providerAccountId,
    connectedAt: record.createdAt,
  };
}

async function readLocalAccounts(): Promise<ConnectedAccountRecord[]> {
  try {
    const raw = await fs.readFile(path.join(LOCAL_DIR, "accounts.json"), "utf8");
    const parsed = JSON.parse(raw) as ConnectedAccountRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalAccounts(accounts: ConnectedAccountRecord[]): Promise<void> {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, "accounts.json"), JSON.stringify(accounts, null, 2));
}

async function readLocalMappings(): Promise<ProviderItemMappingRecord[]> {
  try {
    const raw = await fs.readFile(path.join(LOCAL_DIR, "mappings.json"), "utf8");
    const parsed = JSON.parse(raw) as ProviderItemMappingRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalMappings(mappings: ProviderItemMappingRecord[]): Promise<void> {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, "mappings.json"), JSON.stringify(mappings, null, 2));
}

function rowToAccount(row: typeof connectedAccounts.$inferSelect): ConnectedAccountRecord {
  return {
    id: row.id,
    householdId: row.householdId,
    provider: row.provider as IntegrationProvider,
    providerAccountId: row.providerAccountId,
    email: row.email,
    displayName: row.displayName,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    scopes: row.scopes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function isMicrosoftOAuthConfigured(): boolean {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function listConnectedAccountRecords(
  provider: IntegrationProvider,
): Promise<ConnectedAccountRecord[]> {
  const db = getDb();
  if (!db) {
    return (await readLocalAccounts()).filter((entry) => entry.provider === provider);
  }

  const rows = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.householdId, DEMO_HOUSEHOLD_ID),
        eq(connectedAccounts.provider, provider),
      ),
    );

  return rows.map((row) => rowToAccount(row));
}

export async function listConnectedAccounts(): Promise<ConnectedAccountPublic[]> {
  const records = await listConnectedAccountRecords("microsoft");
  return records.map(toMicrosoftPublic);
}

export async function listGoogleConnectedAccounts(): Promise<GoogleConnectedAccountPublic[]> {
  const records = await listConnectedAccountRecords("google");
  return records.map(toGooglePublic);
}

export async function getConnectedAccountRecord(
  id: string,
): Promise<ConnectedAccountRecord | null> {
  const db = getDb();
  if (!db) {
    return (await readLocalAccounts()).find((entry) => entry.id === id) ?? null;
  }

  const [row] = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(eq(connectedAccounts.id, id), eq(connectedAccounts.householdId, DEMO_HOUSEHOLD_ID)),
    )
    .limit(1);

  return row ? rowToAccount(row) : null;
}

export async function upsertConnectedAccount(input: {
  provider: IntegrationProvider;
  providerAccountId: string;
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scopes: string;
}): Promise<ConnectedAccountRecord> {
  const now = new Date().toISOString();
  const db = getDb();

  if (!db) {
    const local = await readLocalAccounts();
    const existing = local.find(
      (entry) =>
        entry.provider === input.provider &&
        entry.providerAccountId === input.providerAccountId,
    );
    if (existing) {
      const updated: ConnectedAccountRecord = {
        ...existing,
        email: input.email,
        displayName: input.displayName,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? existing.refreshToken,
        expiresAt: input.expiresAt ?? existing.expiresAt,
        scopes: input.scopes,
        updatedAt: now,
      };
      await writeLocalAccounts(
        local.map((entry) => (entry.id === existing.id ? updated : entry)),
      );
      return updated;
    }

    const created: ConnectedAccountRecord = {
      id: randomUUID(),
      householdId: DEMO_HOUSEHOLD_ID,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      email: input.email,
      displayName: input.displayName,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      expiresAt: input.expiresAt ?? null,
      scopes: input.scopes,
      createdAt: now,
      updatedAt: now,
    };
    await writeLocalAccounts([...local, created]);
    return created;
  }

  const [existing] = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.householdId, DEMO_HOUSEHOLD_ID),
        eq(connectedAccounts.provider, input.provider),
        eq(connectedAccounts.providerAccountId, input.providerAccountId),
      ),
    )
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(connectedAccounts)
      .set({
        email: input.email,
        displayName: input.displayName,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? existing.refreshToken,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : existing.expiresAt,
        scopes: input.scopes,
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, existing.id))
      .returning();
    return rowToAccount(row);
  }

  const [row] = await db
    .insert(connectedAccounts)
    .values({
      householdId: DEMO_HOUSEHOLD_ID,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      email: input.email,
      displayName: input.displayName,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      scopes: input.scopes,
    })
    .returning();

  return rowToAccount(row);
}

export async function updateConnectedAccountTokens(
  id: string,
  input: { accessToken: string; refreshToken?: string | null; expiresAt?: string | null },
): Promise<ConnectedAccountRecord | null> {
  const record = await getConnectedAccountRecord(id);
  if (!record) return null;

  return upsertConnectedAccount({
    provider: record.provider,
    providerAccountId: record.providerAccountId,
    email: record.email,
    displayName: record.displayName,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken ?? record.refreshToken,
    expiresAt: input.expiresAt ?? record.expiresAt,
    scopes: record.scopes,
  });
}

export async function deleteConnectedAccount(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    const local = await readLocalAccounts();
    const next = local.filter((entry) => entry.id !== id);
    if (next.length === local.length) return false;
    await writeLocalAccounts(next);
    const mappings = await readLocalMappings();
    await writeLocalMappings(mappings.filter((entry) => entry.connectedAccountId !== id));
    return true;
  }

  const result = await db
    .delete(connectedAccounts)
    .where(
      and(eq(connectedAccounts.id, id), eq(connectedAccounts.householdId, DEMO_HOUSEHOLD_ID)),
    );
  return (result.rowCount ?? 0) > 0;
}

export async function getProviderMapping(
  itemType: "calendar" | "email" | "task",
  localItemId: string,
): Promise<ProviderItemMappingRecord | null> {
  const db = getDb();
  if (!db) {
    return (
      (await readLocalMappings()).find(
        (entry) => entry.itemType === itemType && entry.localItemId === localItemId,
      ) ?? null
    );
  }

  const [row] = await db
    .select()
    .from(providerItemMappings)
    .where(
      and(
        eq(providerItemMappings.householdId, DEMO_HOUSEHOLD_ID),
        eq(providerItemMappings.itemType, itemType),
        eq(providerItemMappings.localItemId, localItemId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    householdId: row.householdId,
    connectedAccountId: row.connectedAccountId,
    itemType: row.itemType as ProviderItemMappingRecord["itemType"],
    localItemId: row.localItemId,
    externalId: row.externalId,
    provider: "microsoft",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function upsertProviderMapping(input: {
  connectedAccountId: string;
  itemType: "calendar" | "email" | "task";
  localItemId: string;
  externalId: string;
}): Promise<ProviderItemMappingRecord> {
  const db = getDb();
  const now = new Date().toISOString();

  if (!db) {
    const local = await readLocalMappings();
    const existing = local.find(
      (entry) => entry.itemType === input.itemType && entry.localItemId === input.localItemId,
    );
    if (existing) {
      const updated = { ...existing, externalId: input.externalId, connectedAccountId: input.connectedAccountId };
      await writeLocalMappings(local.map((entry) => (entry.id === existing.id ? updated : entry)));
      return updated;
    }
    const created: ProviderItemMappingRecord = {
      id: randomUUID(),
      householdId: DEMO_HOUSEHOLD_ID,
      connectedAccountId: input.connectedAccountId,
      itemType: input.itemType,
      localItemId: input.localItemId,
      externalId: input.externalId,
      provider: "microsoft",
      createdAt: now,
    };
    await writeLocalMappings([...local, created]);
    return created;
  }

  const [row] = await db
    .insert(providerItemMappings)
    .values({
      householdId: DEMO_HOUSEHOLD_ID,
      connectedAccountId: input.connectedAccountId,
      itemType: input.itemType,
      localItemId: input.localItemId,
      externalId: input.externalId,
      provider: "microsoft",
    })
    .onConflictDoUpdate({
      target: [
        providerItemMappings.householdId,
        providerItemMappings.itemType,
        providerItemMappings.localItemId,
      ],
      set: {
        externalId: input.externalId,
        connectedAccountId: input.connectedAccountId,
      },
    })
    .returning();

  return {
    id: row.id,
    householdId: row.householdId,
    connectedAccountId: row.connectedAccountId,
    itemType: row.itemType as ProviderItemMappingRecord["itemType"],
    localItemId: row.localItemId,
    externalId: row.externalId,
    provider: "microsoft",
    createdAt: row.createdAt.toISOString(),
  };
}
