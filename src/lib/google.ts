import type { GoogleCalendarDto, GoogleIntegrationStatus } from "../../shared/googleApi";
import type { CalendarItem, EmailFolder, EmailMessage } from "../types";
import { getClientTimeZone } from "./itemTimeHelpers";

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

export async function fetchGoogleDriveFolders(
  accountId: string,
  parentId?: string,
): Promise<
  Array<{
    id: string;
    name: string;
    webUrl?: string;
    accountId: string;
    connectedAccountId: string;
    parentId?: string;
  }>
> {
  const params = new URLSearchParams({ accountId });
  if (parentId) params.set("parentId", parentId);
  return apiFetch(`/api/google/drive/folders?${params.toString()}`);
}

export async function copyEmailToGoogleDriveFolder(
  accountId: string,
  folderId: string,
  input: { subject: string; from: string; fromEmail: string; date: string; body: string },
): Promise<{ name: string; webUrl?: string }> {
  return apiFetch("/api/google/drive/copy-email", {
    method: "POST",
    body: JSON.stringify({ accountId, folderId, ...input }),
  });
}

export async function sendGoogleMail(
  accountId: string,
  input: { to: string | string[]; subject: string; body: string },
): Promise<void> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  await apiFetch<void>("/api/google/mail/send", {
    method: "POST",
    body: JSON.stringify({ accountId, ...input, to }),
  });
}

export async function replyGoogleMail(
  accountId: string,
  externalId: string,
  input: { comment: string; replyAll?: boolean },
): Promise<void> {
  await apiFetch<void>(`/api/google/mail/${encodeURIComponent(externalId)}/reply`, {
    method: "POST",
    body: JSON.stringify({ accountId, ...input }),
  });
}

export async function deleteGoogleMail(accountId: string, externalId: string): Promise<void> {
  await apiFetch<void>(
    `/api/google/mail/${encodeURIComponent(externalId)}?accountId=${encodeURIComponent(accountId)}`,
    { method: "DELETE" },
  );
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

export async function fetchGoogleCalendarsList(accountId: string): Promise<GoogleCalendarDto[]> {
  return apiFetch<GoogleCalendarDto[]>(
    `/api/google/calendars?accountId=${encodeURIComponent(accountId)}`,
  );
}

export async function fetchAllGoogleCalendarsList(
  accounts: GoogleIntegrationStatus["accounts"],
): Promise<GoogleCalendarDto[]> {
  if (accounts.length === 0) return [];
  const batches = await Promise.all(
    accounts.map((account) => fetchGoogleCalendarsList(account.id)),
  );
  return batches.flat();
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

export async function syncCalendarToGoogle(
  accountId: string,
  item: CalendarItem,
  calendarId?: string,
): Promise<{ externalId: string; htmlLink?: string }> {
  return apiFetch("/api/google/calendar/sync", {
    method: "POST",
    body: JSON.stringify({
      accountId,
      item: {
        localItemId: item.id,
        title: item.title,
        date: item.date,
        endDate: item.endDate,
        startTime: item.startTime,
        endTime: item.endTime,
        allDay: item.allDay,
        notes: item.notes,
        calendarId,
        reminderPreset: item.reminderPreset,
        reminderCustomMinutes: item.reminderCustomMinutes,
        reminderAt: item.reminderAt,
        timeZone: getClientTimeZone(),
      },
    }),
  });
}
