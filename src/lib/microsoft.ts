import type { MicrosoftIntegrationStatus } from "../../shared/microsoftGraph";
import type { CalendarItem, EmailMessage, Note } from "../types";

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

export async function fetchMicrosoftCalendar(accountId: string): Promise<CalendarItem[]> {
  return apiFetch<CalendarItem[]>(`/api/microsoft/calendar?accountId=${encodeURIComponent(accountId)}`);
}

export async function fetchMicrosoftNotes(accountId: string): Promise<Note[]> {
  return apiFetch<Note[]>(`/api/microsoft/notes?accountId=${encodeURIComponent(accountId)}`);
}

export async function createMicrosoftNote(
  accountId: string,
  input: { title: string; body: string },
): Promise<{ externalId: string }> {
  return apiFetch("/api/microsoft/notes", {
    method: "POST",
    body: JSON.stringify({ accountId, ...input }),
  });
}

export async function updateMicrosoftNote(
  accountId: string,
  externalId: string,
  input: { title: string; body: string },
): Promise<void> {
  await apiFetch<void>(`/api/microsoft/notes/${encodeURIComponent(externalId)}`, {
    method: "PATCH",
    body: JSON.stringify({ accountId, ...input }),
  });
}

export async function deleteMicrosoftNote(accountId: string, externalId: string): Promise<void> {
  await apiFetch<void>(
    `/api/microsoft/notes/${encodeURIComponent(externalId)}?accountId=${encodeURIComponent(accountId)}`,
    { method: "DELETE" },
  );
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
  localEmails: EmailMessage[],
  graphEmails: EmailMessage[],
): EmailMessage[] {
  const graphExternalIds = new Set(
    graphEmails.map((email) => email.externalId).filter(Boolean) as string[],
  );
  const locals = localEmails.filter((email) => !email.externalId && email.provider !== "microsoft");
  const dedupedGraph = graphEmails.filter(
    (email, index, list) =>
      list.findIndex((entry) => entry.externalId === email.externalId) === index,
  );
  const syncedLocals = localEmails.filter(
    (email) => email.externalId && !graphExternalIds.has(email.externalId),
  );
  return [...dedupedGraph, ...syncedLocals, ...locals];
}

export function mergeGraphCalendar(
  localItems: CalendarItem[],
  graphItems: CalendarItem[],
): CalendarItem[] {
  const graphExternalIds = new Set(
    graphItems.map((item) => item.externalId).filter(Boolean) as string[],
  );
  const locals = localItems.filter((item) => {
    if (item.provider === "microsoft" && item.externalId) {
      return !graphExternalIds.has(item.externalId);
    }
    if (item.externalId) return !graphExternalIds.has(item.externalId);
    return !item.id.startsWith("graph-");
  });
  const dedupedGraph = graphItems.filter(
    (item, index, list) =>
      list.findIndex((entry) => entry.externalId === item.externalId) === index,
  );
  return [...dedupedGraph, ...locals];
}

export function mergeGraphNotes(localNotes: Note[], graphNotes: Note[]): Note[] {
  const graphExternalIds = new Set(
    graphNotes.map((note) => note.externalId).filter(Boolean) as string[],
  );
  const locals = localNotes.filter((note) => {
    if (note.provider === "microsoft" || note.externalId) {
      return !graphExternalIds.has(note.externalId ?? "");
    }
    if (note.id.startsWith("graph-note-")) return false;
    return true;
  });
  const dedupedGraph = graphNotes.filter(
    (note, index, list) =>
      list.findIndex((entry) => entry.externalId === note.externalId) === index,
  );
  return [...dedupedGraph, ...locals].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
