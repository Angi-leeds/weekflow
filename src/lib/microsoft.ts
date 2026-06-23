import type { MicrosoftIntegrationStatus } from "../../shared/microsoftGraph";
import type { CalendarItem, EmailMessage } from "../types";

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

export async function fetchMicrosoftStatus(): Promise<MicrosoftIntegrationStatus> {
  return apiFetch<MicrosoftIntegrationStatus>("/api/microsoft/status");
}

export function startMicrosoftConnect(): void {
  window.location.href = "/api/microsoft/auth/start";
}

export async function disconnectMicrosoftAccount(accountId: string): Promise<void> {
  await apiFetch<void>(`/api/microsoft/accounts/${accountId}`, { method: "DELETE" });
}

export async function fetchMicrosoftMail(accountId: string): Promise<EmailMessage[]> {
  return apiFetch<EmailMessage[]>(`/api/microsoft/mail?accountId=${encodeURIComponent(accountId)}`);
}

export async function syncCalendarToMicrosoft(
  accountId: string,
  item: CalendarItem,
  photo?: { storageKey: string; mimeType: string; filename: string },
): Promise<{ externalId: string; webLink?: string }> {
  return apiFetch("/api/microsoft/calendar/sync", {
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
        photoStorageKey: photo?.storageKey,
        photoMimeType: photo?.mimeType,
        photoFilename: photo?.filename,
      },
    }),
  });
}

export async function createMicrosoftTodo(
  accountId: string,
  input: { title: string; dueDate?: string; notes?: string },
): Promise<{ externalId: string }> {
  return apiFetch("/api/microsoft/todo", {
    method: "POST",
    body: JSON.stringify({ accountId, ...input }),
  });
}

export function microsoftAccountKey(accountId: string): string {
  return `ms-${accountId}`;
}

export function mergeGraphMail(
  mockEmails: EmailMessage[],
  graphEmails: EmailMessage[],
): EmailMessage[] {
  const graphExternalIds = new Set(
    graphEmails.map((email) => email.externalId).filter(Boolean) as string[],
  );
  const locals = mockEmails.filter((email) => !email.externalId);
  const dedupedGraph = graphEmails.filter(
    (email, index, list) =>
      list.findIndex((entry) => entry.externalId === email.externalId) === index,
  );
  return [...dedupedGraph, ...locals.filter((email) => !graphExternalIds.has(email.id))];
}
