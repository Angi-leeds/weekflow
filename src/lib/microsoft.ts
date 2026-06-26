import type {
  GraphCalendarDto,
  GraphDriveItemDto,
  GraphMailAttachmentDto,
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

export async function updateMicrosoftMailReadState(
  accountId: string,
  externalId: string,
  isRead: boolean,
): Promise<void> {
  await apiFetch<void>(`/api/microsoft/mail/${encodeURIComponent(externalId)}/read`, {
    method: "PATCH",
    body: JSON.stringify({ accountId, isRead }),
  });
}

export async function moveMicrosoftMail(
  accountId: string,
  externalId: string,
  destinationFolderId: string,
): Promise<void> {
  await apiFetch<void>(`/api/microsoft/mail/${encodeURIComponent(externalId)}/move`, {
    method: "POST",
    body: JSON.stringify({ accountId, destinationFolderId }),
  });
}

export async function forwardMicrosoftMail(
  accountId: string,
  externalId: string,
  input: { comment: string; to: string[] },
): Promise<void> {
  await apiFetch<void>(`/api/microsoft/mail/${encodeURIComponent(externalId)}/forward`, {
    method: "POST",
    body: JSON.stringify({ accountId, ...input }),
  });
}

export async function searchMicrosoftMail(
  accountId: string,
  query: string,
): Promise<EmailMessage[]> {
  const params = new URLSearchParams({ accountId, q: query });
  return apiFetch<EmailMessage[]>(`/api/microsoft/mail/search?${params.toString()}`);
}

export async function fetchMicrosoftMessageAttachments(
  accountId: string,
  externalId: string,
): Promise<GraphMailAttachmentDto[]> {
  const params = new URLSearchParams({ accountId });
  return apiFetch<GraphMailAttachmentDto[]>(
    `/api/microsoft/mail/${encodeURIComponent(externalId)}/attachments?${params.toString()}`,
  );
}

export function microsoftAttachmentDownloadUrl(
  accountId: string,
  externalId: string,
  attachmentId: string,
): string {
  const params = new URLSearchParams({ accountId });
  return `/api/microsoft/mail/${encodeURIComponent(externalId)}/attachments/${encodeURIComponent(attachmentId)}?${params.toString()}`;
}

export async function saveMicrosoftMailDraft(
  accountId: string,
  input: { to: string[]; subject: string; body: string; draftId?: string },
): Promise<{ externalId: string }> {
  return apiFetch("/api/microsoft/mail/draft", {
    method: "POST",
    body: JSON.stringify({ accountId, ...input }),
  });
}

export async function fetchOneDriveFolders(
  accountId: string,
  parentId?: string,
): Promise<GraphDriveItemDto[]> {
  const params = new URLSearchParams({ accountId });
  if (parentId) params.set("parentId", parentId);
  return apiFetch(`/api/microsoft/drive/folders?${params.toString()}`);
}

export interface OneDriveItem {
  id: string;
  name: string;
  webUrl?: string;
  accountId: string;
  connectedAccountId: string;
  parentId?: string;
  size?: number;
  isFolder: boolean;
}

export async function fetchOneDriveItems(
  accountId: string,
  parentId?: string,
): Promise<OneDriveItem[]> {
  const params = new URLSearchParams({ accountId });
  if (parentId) params.set("parentId", parentId);
  return apiFetch(`/api/microsoft/drive/items?${params.toString()}`);
}

export async function uploadOneDriveFile(
  accountId: string,
  parentId: string,
  file: File,
): Promise<{ id: string; name: string; webUrl?: string }> {
  const buffer = await file.arrayBuffer();
  const contentBase64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return apiFetch("/api/microsoft/drive/upload", {
    method: "POST",
    body: JSON.stringify({
      accountId,
      parentId,
      fileName: file.name,
      contentBase64,
      contentType: file.type || "application/octet-stream",
    }),
  });
}

export async function deleteOneDriveItem(accountId: string, itemId: string): Promise<void> {
  await apiFetch<void>(
    `/api/microsoft/drive/items/${encodeURIComponent(itemId)}?accountId=${encodeURIComponent(accountId)}`,
    { method: "DELETE" },
  );
}

export async function sendMicrosoftMailWithDriveAttachments(
  accountId: string,
  input: {
    to: string | string[];
    subject: string;
    body: string;
    driveAttachmentIds?: string[];
  },
): Promise<void> {
  const to = Array.isArray(input.to) ? input.to : [input.to];
  await apiFetch<void>("/api/microsoft/mail/send-with-attachments", {
    method: "POST",
    body: JSON.stringify({ accountId, ...input, to }),
  });
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

export async function fetchMicrosoftCalendar(
  accountId: string,
  options?: { defaultOnly?: boolean },
): Promise<CalendarItem[]> {
  const params = new URLSearchParams({ accountId });
  if (options?.defaultOnly) params.set("defaultOnly", "true");
  return apiFetch<CalendarItem[]>(`/api/microsoft/calendar?${params.toString()}`);
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

export async function fetchMicrosoftTodoBundle(
  accountId: string,
): Promise<{ lists: GraphTodoListDto[]; tasks: CalendarItem[] }> {
  return apiFetch<{ lists: GraphTodoListDto[]; tasks: CalendarItem[] }>(
    `/api/microsoft/todo/bundle?accountId=${encodeURIComponent(accountId)}`,
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

function contactToSyncInput(contact: Contact): {
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
} {
  return {
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
  };
}

export async function createMicrosoftContact(
  accountId: string,
  contact: Contact,
): Promise<{ externalId: string }> {
  return apiFetch("/api/microsoft/contacts", {
    method: "POST",
    body: JSON.stringify({ accountId, ...contactToSyncInput(contact) }),
  });
}

export async function updateMicrosoftContact(
  accountId: string,
  externalId: string,
  contact: Contact,
): Promise<void> {
  await apiFetch<void>(`/api/microsoft/contacts/${encodeURIComponent(externalId)}`, {
    method: "PATCH",
    body: JSON.stringify({ accountId, ...contactToSyncInput(contact) }),
  });
}

export async function deleteMicrosoftContact(accountId: string, externalId: string): Promise<void> {
  await apiFetch<void>(
    `/api/microsoft/contacts/${encodeURIComponent(externalId)}?accountId=${encodeURIComponent(accountId)}`,
    { method: "DELETE" },
  );
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
  options?: { defaultOnly?: boolean },
): Promise<CalendarItem[]> {
  if (accounts.length === 0) return [];
  const batches = await Promise.all(
    accounts.map((account) => fetchMicrosoftCalendar(account.id, options)),
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

export async function fetchAllMicrosoftTodoListsAndTasks(
  accounts: MicrosoftIntegrationStatus["accounts"],
): Promise<{ lists: GraphTodoListDto[]; tasks: CalendarItem[] }> {
  if (accounts.length === 0) return { lists: [], tasks: [] };
  const batches = await Promise.all(
    accounts.map((account) => fetchMicrosoftTodoBundle(account.id)),
  );
  return {
    lists: batches.flatMap((batch) => batch.lists),
    tasks: batches.flatMap((batch) => batch.tasks),
  };
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

export async function respondToMicrosoftCalendarEvent(
  accountId: string,
  externalId: string,
  response: "accept" | "decline" | "tentativelyAccept",
  comment?: string,
): Promise<void> {
  await apiFetch<void>(`/api/microsoft/calendar/${encodeURIComponent(externalId)}/respond`, {
    method: "POST",
    body: JSON.stringify({ accountId, response, comment }),
  });
}

export async function getMicrosoftSchedule(
  accountId: string,
  input: { emails: string[]; start: string; end: string },
): Promise<Array<{ email: string; availabilityView: string }>> {
  return apiFetch("/api/microsoft/calendar/schedule", {
    method: "POST",
    body: JSON.stringify({ accountId, ...input }),
  });
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
        externalId: item.externalId,
        attendees: item.attendees,
        recurringWeekly: item.recurringWeekly,
        teamsMeeting: item.teamsMeeting,
        photoStorageKey: photo?.storageKey,
        photoMimeType: photo?.mimeType,
        photoFilename: photo?.filename,
      },
    }),
  });
}

export async function syncMicrosoftTodo(
  accountId: string,
  item: CalendarItem,
  todoListId?: string,
): Promise<{ externalId: string; todoListId: string }> {
  return apiFetch("/api/microsoft/todo/sync", {
    method: "POST",
    body: JSON.stringify({
      accountId,
      item: {
        localItemId: item.id,
        title: item.title,
        dueDate: item.date,
        notes: item.notes,
        todoListId: item.todoListId ?? todoListId,
        externalId: item.externalId,
        completed: item.completed,
      },
    }),
  });
}

export async function deleteMicrosoftCalendarEvent(
  accountId: string,
  externalId: string,
  calendarId?: string,
): Promise<void> {
  const params = new URLSearchParams({ accountId });
  if (calendarId) params.set("calendarId", calendarId);
  await apiFetch<void>(
    `/api/microsoft/calendar/${encodeURIComponent(externalId)}?${params.toString()}`,
    { method: "DELETE" },
  );
}

export async function deleteMicrosoftTodo(
  accountId: string,
  externalId: string,
  todoListId: string,
): Promise<void> {
  const params = new URLSearchParams({ accountId, todoListId });
  await apiFetch<void>(
    `/api/microsoft/todo/${encodeURIComponent(externalId)}?${params.toString()}`,
    { method: "DELETE" },
  );
}

export async function completeMicrosoftTodo(
  accountId: string,
  externalId: string,
  todoListId: string,
  completed: boolean,
): Promise<void> {
  await apiFetch<void>(`/api/microsoft/todo/${encodeURIComponent(externalId)}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ accountId, todoListId, completed }),
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
