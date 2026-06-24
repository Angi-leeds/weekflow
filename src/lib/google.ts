import type { GoogleIntegrationStatus } from "../../shared/googleApi";
import type { CalendarItem, EmailFolder, EmailMessage } from "../types";

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

export async function fetchGoogleStatus(): Promise<GoogleIntegrationStatus> {
  return apiFetch<GoogleIntegrationStatus>("/api/google/status");
}

export function startGoogleConnect(): void {
  window.location.href = "/api/google/auth/start";
}

export async function disconnectGoogleAccount(accountId: string): Promise<void> {
  await apiFetch<void>(`/api/google/accounts/${accountId}`, { method: "DELETE" });
}

export function googleAccountKey(accountId: string): string {
  return `google-${accountId}`;
}

export async function fetchGoogleMailFolders(accountId: string): Promise<EmailFolder[]> {
  const folders = await apiFetch<
    Array<{
      id: string;
      labelId: string;
      label: string;
      accountId: string;
      connectedAccountId: string;
      wellKnown?: EmailFolder["wellKnown"];
    }>
  >(`/api/google/mail/folders?accountId=${encodeURIComponent(accountId)}`);

  return folders.map((folder) => ({
    id: folder.id,
    label: folder.label,
    accountId: folder.accountId,
    graphFolderId: folder.labelId,
    connectedAccountId: folder.connectedAccountId,
    wellKnown: folder.wellKnown,
  }));
}

export async function fetchGoogleMail(
  accountId: string,
  labelId?: string,
): Promise<EmailMessage[]> {
  const params = new URLSearchParams({ accountId });
  if (labelId) params.set("labelId", labelId);
  return apiFetch<EmailMessage[]>(`/api/google/mail?${params.toString()}`);
}

export async function fetchGoogleCalendar(accountId: string): Promise<CalendarItem[]> {
  return apiFetch<CalendarItem[]>(
    `/api/google/calendar?accountId=${encodeURIComponent(accountId)}`,
  );
}

export async function fetchAllGoogleMail(
  accounts: GoogleIntegrationStatus["accounts"],
): Promise<{ mail: EmailMessage[]; folders: EmailFolder[] }> {
  if (accounts.length === 0) return { mail: [], folders: [] };

  const batches = await Promise.all(
    accounts.map(async (account) => {
      const folders = await fetchGoogleMailFolders(account.id);
      const inbox = folders.find((folder) => folder.wellKnown === "inbox") ?? folders[0];
      const mail = inbox
        ? await fetchGoogleMail(account.id, inbox.graphFolderId)
        : await fetchGoogleMail(account.id);
      return { folders, mail };
    }),
  );

  return {
    folders: batches.flatMap((batch) => batch.folders),
    mail: batches.flatMap((batch) => batch.mail),
  };
}

export async function fetchAllGoogleCalendar(
  accounts: GoogleIntegrationStatus["accounts"],
): Promise<CalendarItem[]> {
  if (accounts.length === 0) return [];
  const batches = await Promise.all(
    accounts.map((account) => fetchGoogleCalendar(account.id)),
  );
  return batches.flat();
}
