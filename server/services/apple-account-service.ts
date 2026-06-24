import type {
  AppleAccountMetadata,
  AppleConnectedAccountPublic,
  CreateAppleAccountInput,
} from "../../shared/appleApi";
import {
  deleteConnectedAccount,
  getConnectedAccountRecord,
  listConnectedAccountRecords,
  upsertConnectedAccount,
  type ConnectedAccountRecord,
} from "./connected-account-service";

const APPLE_ACCESS_TOKEN_PLACEHOLDER = "manual-link";

function parseAppleMetadata(scopes: string): AppleAccountMetadata {
  if (!scopes) return {};
  try {
    const parsed = JSON.parse(scopes) as AppleAccountMetadata;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function serializeAppleMetadata(metadata: AppleAccountMetadata): string {
  return JSON.stringify(metadata);
}

function accountKeyFromRecord(record: ConnectedAccountRecord): string {
  return `apple-${record.id}`;
}

function toApplePublic(record: ConnectedAccountRecord): AppleConnectedAccountPublic {
  const metadata = parseAppleMetadata(record.scopes);
  return {
    id: record.id,
    provider: "apple",
    email: record.email,
    displayName: record.displayName,
    providerAccountId: record.providerAccountId,
    connectedAt: record.createdAt,
    calendarSubscribeUrl: metadata.calendarSubscribeUrl,
  };
}

export async function listAppleConnectedAccounts(): Promise<AppleConnectedAccountPublic[]> {
  const records = await listConnectedAccountRecords("apple");
  return records.map(toApplePublic);
}

export async function createAppleConnectedAccount(
  input: CreateAppleAccountInput,
): Promise<AppleConnectedAccountPublic> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("A valid iCloud email address is required");
  }

  const calendarSubscribeUrl = input.calendarSubscribeUrl?.trim() || undefined;
  if (calendarSubscribeUrl && !/^https?:\/\/|^webcal:\/\//i.test(calendarSubscribeUrl)) {
    throw new Error("Calendar subscribe URL must start with https:// or webcal://");
  }

  const metadata: AppleAccountMetadata = {};
  if (calendarSubscribeUrl) {
    metadata.calendarSubscribeUrl = calendarSubscribeUrl;
  }

  const record = await upsertConnectedAccount({
    provider: "apple",
    providerAccountId: email,
    email,
    displayName: input.displayName?.trim() || email.split("@")[0] || "iCloud",
    accessToken: APPLE_ACCESS_TOKEN_PLACEHOLDER,
    refreshToken: null,
    expiresAt: null,
    scopes: serializeAppleMetadata(metadata),
  });

  return toApplePublic(record);
}

export async function updateAppleConnectedAccount(
  id: string,
  input: { displayName?: string; calendarSubscribeUrl?: string },
): Promise<AppleConnectedAccountPublic | null> {
  const record = await getConnectedAccountRecord(id);
  if (!record || record.provider !== "apple") return null;

  const metadata = parseAppleMetadata(record.scopes);
  if (input.calendarSubscribeUrl !== undefined) {
    const trimmed = input.calendarSubscribeUrl.trim();
    if (trimmed && !/^https?:\/\/|^webcal:\/\//i.test(trimmed)) {
      throw new Error("Calendar subscribe URL must start with https:// or webcal://");
    }
    metadata.calendarSubscribeUrl = trimmed || undefined;
  }

  const updated = await upsertConnectedAccount({
    provider: record.provider,
    providerAccountId: record.providerAccountId,
    email: record.email,
    displayName: input.displayName?.trim() || record.displayName,
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
    expiresAt: record.expiresAt,
    scopes: serializeAppleMetadata(metadata),
  });

  return toApplePublic(updated);
}

export async function deleteAppleConnectedAccount(id: string): Promise<boolean> {
  const record = await getConnectedAccountRecord(id);
  if (!record || record.provider !== "apple") return false;
  return deleteConnectedAccount(id);
}

export function getAppleAccountKey(record: ConnectedAccountRecord): string {
  return accountKeyFromRecord(record);
}

export function getAppleCalendarSubscribeUrl(record: ConnectedAccountRecord): string | undefined {
  return parseAppleMetadata(record.scopes).calendarSubscribeUrl;
}
