import type {
  AppleConnectedAccountPublic,
  AppleIntegrationStatus,
  CreateAppleAccountInput,
} from "../../shared/appleApi";
import type { CalendarItem } from "../types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchAppleStatus(): Promise<AppleIntegrationStatus> {
  return apiFetch<AppleIntegrationStatus>("/api/apple/status");
}

export function appleAccountKey(accountId: string): string {
  return `apple-${accountId}`;
}

export async function createAppleAccount(input: CreateAppleAccountInput): Promise<AppleConnectedAccountPublic> {
  return apiFetch<AppleConnectedAccountPublic>("/api/apple/accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAppleAccount(
  accountId: string,
  input: { displayName?: string; calendarSubscribeUrl?: string },
): Promise<AppleConnectedAccountPublic> {
  return apiFetch<AppleConnectedAccountPublic>(`/api/apple/accounts/${accountId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function disconnectAppleAccount(accountId: string): Promise<void> {
  await apiFetch<void>(`/api/apple/accounts/${accountId}`, { method: "DELETE" });
}

export async function fetchAppleCalendar(accountId: string): Promise<CalendarItem[]> {
  return apiFetch<CalendarItem[]>(
    `/api/apple/calendar?accountId=${encodeURIComponent(accountId)}`,
  );
}

export async function fetchAllAppleCalendar(
  accounts: AppleIntegrationStatus["accounts"],
): Promise<CalendarItem[]> {
  if (accounts.length === 0) return [];
  const batches = await Promise.all(
    accounts
      .filter((account) => Boolean(account.calendarSubscribeUrl))
      .map((account) => fetchAppleCalendar(account.id)),
  );
  return batches.flat();
}
