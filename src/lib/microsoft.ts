import type {
  GraphCalendarDto,
  GraphDriveItemDto,
  GraphMailFolderDto,
  GraphTodoListDto,
  MicrosoftIntegrationStatus,
} from "../../shared/microsoftGraph";
import type { CalendarItem, Contact, EmailMessage, EmailFolder, Note } from "../types";

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

export async function fetchMicrosoftMail(
  accountId: string,
  folderGraphId?: string,
): Promise<EmailMessage[]> {
  const params = new URLSearchParams({ accountId });
  if (folderGraphId) params.set("folderId", folderGraphId);
  return apiFetch<EmailMessage[]>(`/api/microsoft/mail?${params.toString()}`);
}

export async function sendMicrosoftMail(
  accountId: string,
  input: { to: string | string[]; subject: string; body: string },
): Promise<void> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  await apiFetch<void>("/api/microsoft/mail/send", {
    method: "POST",
    body: JSON.stringify({ accountId, ...input, to }),
  });
}

export async function replyMicrosoftMail(
  accountId: string,
  externalId: string,
  input: { comment: string; replyAll?: boolean },
): Promise<void> {
  await apiFetch<void>(`/api/microsoft/mail/${encodeURIComponent(externalId)}/reply`, {
    method: "POST",
    body: JSON.stringify({ accountId, ...input }),
  });
}

export async function deleteMicrosoftMail(accountId: string, externalId: string): Promise<void> {
  await apiFetch<void>(
    `/api/microsoft/mail/${encodeURIComponent(externalId)}?accountId=${encodeURIComponent(accountId)}`,
    { method: "DELETE" },
  );
}

export async function fetchOneDriveFolders(
  accountId: string,
  parentId?: string,
): Promise<GraphDriveItemDto[]> {
  const params = new URLSearchParams({ accountId });
  if (parentId) params.set("parentId", parentId);
  return apiFetch(`/api/microsoft/drive/folders?${params.toString()}`);
}

export async function copyEmailToOneDriveFolder(
  accountId: string,
  folderId: string,
  input: { subject: string; from: string; fromEmail: string; date: string; body: string },
): Promise<{ name: string; webUrl?: string }> {
  return apiFetch("/api/microsoft/drive/copy-email", {
    method: "POST",
    body: JSON.stringify({ accountId, folderId, ...input }),
  });
}

export async function fetchMicrosoftMailFolders(accountId: string): Promise<EmailFolder[]> {
  return apiFetch<EmailFolder[]>(
    `/api/microsoft/mail/folders?accountId=${encodeURIComponent(accountId)}`,
  );
}

export async function fetchMicrosoftCalendar(accountId: string): Promise<CalendarItem[]> {
  return apiFetch<CalendarItem[]>(`/api/microsoft/calendar?accountId=${encodeURIComponent(accountId)}`);
}

export async function fetchMicrosoftCalendars(accountId: string): Promise<GraphCalendarDto[]> {
  return apiFetch<GraphCalendarDto[]>(
    `/api/microsoft/calendars?accountId=${encodeURIComponent(accountId)}`,
  );
}

export async function fetchMicrosoftTodoLists(accountId: string): Promise<GraphTodoListDto[]> {
  return apiFetch<GraphTodoListDto[]>(
    `/api/microsoft/todo/lists?accountId=${encodeURIComponent(accountId)}`,
  );
}

export async function fetchMicrosoftTodoTasks(accountId: string): Promise<CalendarItem[]> {
  return apiFetch<CalendarItem[]>(
    `/api/microsoft/todo/tasks?accountId=${encodeURIComponent(accountId)}`,
  );
}

export async function fetchMicrosoftContacts(accountId: string): Promise<Contact[]> {
  const contacts = await apiFetch<
    Array<{
      id: string;
      name: string;
      email?: string;
      emailSecondary?: string;
      phone?: string;
      mobilePhone?: string;
      homePhone?: string;
      company?: string;
      jobTitle?: string;
      department?: string;
      website?: string;
      address?: string;
      birthday?: string;
      notes?: string;
      accountId: string;
      connectedAccountId: string;
      externalId: string;
      provider: "microsoft";
    }>
  >(`/api/microsoft/contacts?accountId=${encodeURIComponent(accountId)}`);

  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    emailSecondary: contact.emailSecondary,
    phone: contact.phone,
    mobilePhone: contact.mobilePhone,
    homePhone: contact.homePhone,
    company: contact.company,
    jobTitle: contact.jobTitle,
    department: contact.department,
    website: contact.website,
    address: contact.address,
    birthday: contact.birthday,
    notes: contact.notes,
    source: "microsoft" as const,
    externalId: contact.externalId,
    accountId: contact.accountId,
    connectedAccountId: contact.connectedAccountId,
    categories: ["Outlook"],
  }));
}

export async function fetchAllMicrosoftMail(
  accounts: MicrosoftIntegrationStatus["accounts"],
): Promise<{ mail: EmailMessage[]; folders: EmailFolder[] }> {
  if (accounts.length === 0) return { mail: [], folders: [] };

  const batches = await Promise.all(
    accounts.map(async (account) => {
      const folders = await fetchMicrosoftMailFolders(account.id);
      const inbox = folders.find((folder) => folder.wellKnown === "inbox") ?? folders[0];
      const mail = inbox
        ? await fetchMicrosoftMail(account.id, inbox.graphFolderId)
        : await fetchMicrosoftMail(account.id);
      return { folders, mail };
    }),
  );

  return {
    folders: batches.flatMap((batch) => batch.folders),
    mail: batches.flatMap((batch) => batch.mail),
  };
}

export async function fetchAllMicrosoftCalendar(
  accounts: MicrosoftIntegrationStatus["accounts"],
): Promise<CalendarItem[]> {
  if (accounts.length === 0) return [];
  const batches = await Promise.all(
    accounts.map((account) => fetchMicrosoftCalendar(account.id)),
  );
  return batches.flat();
}

export async function fetchAllMicrosoftContacts(
  accounts: MicrosoftIntegrationStatus["accounts"],
): Promise<Contact[]> {
  if (accounts.length === 0) return [];
  const batches = await Promise.all(
    accounts.map((account) => fetchMicrosoftContacts(account.id)),
  );
  return batches.flat();
}

export async function fetchAllMicrosoftCalendarsList(
  accounts: MicrosoftIntegrationStatus["accounts"],
): Promise<GraphCalendarDto[]> {
  if (accounts.length === 0) return [];
  const batches = await Promise.all(
    accounts.map((account) => fetchMicrosoftCalendars(account.id)),
  );
  return batches.flat();
}

export async function fetchAllMicrosoftTodoLists(
  accounts: MicrosoftIntegrationStatus["accounts"],
): Promise<GraphTodoListDto[]> {
  if (accounts.length === 0) return [];
  const batches = await Promise.all(
    accounts.map((account) => fetchMicrosoftTodoLists(account.id)),
  );
  return batches.flat();
}

export async function fetchAllMicrosoftTodoTasks(
  accounts: MicrosoftIntegrationStatus["accounts"],
): Promise<CalendarItem[]> {
  if (accounts.length === 0) return [];
  const batches = await Promise.all(
    accounts.map((account) => fetchMicrosoftTodoTasks(account.id)),
  );
  return batches.flat();
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
  calendarId?: string,
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
        calendarId,
        photoStorageKey: photo?.storageKey,
        photoMimeType: photo?.mimeType,
        photoFilename: photo?.filename,
      },
    }),
  });
}

export async function createMicrosoftTodo(
  accountId: string,
  input: { title: string; dueDate?: string; notes?: string; todoListId?: string },
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
  const locals = localEmails.filter(
    (email) =>
      email.provider !== "microsoft" &&
      email.provider !== "google" &&
      email.provider !== "apple" &&
      !email.externalId,
  );
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
    if ((item.provider === "microsoft" || item.provider === "google" || item.provider === "apple") && item.externalId) {
      return !graphExternalIds.has(item.externalId);
    }
    if (item.externalId) return !graphExternalIds.has(item.externalId);
    return (
      !item.id.startsWith("graph-") &&
      !item.id.startsWith("gcal-") &&
      !item.id.startsWith("applecal-") &&
      !item.id.startsWith("graph-todo-")
    );
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
