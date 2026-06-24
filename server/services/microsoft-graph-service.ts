import fs from "fs/promises";
import path from "path";
import type {
  GraphCalendarDto,
  GraphCalendarEventResult,
  GraphDriveItemDto,
  GraphMailFolderDto,
  GraphTodoListDto,
} from "../../shared/microsoftGraph";
import { normalizeEmailBody } from "../../shared/emailBody";
import { MICROSOFT_GRAPH_BASE } from "../../shared/microsoftGraph";
import {
  type ConnectedAccountRecord,
  getConnectedAccountRecord,
  getProviderMapping,
  updateConnectedAccountTokens,
  upsertProviderMapping,
} from "./connected-account-service";
import { refreshMicrosoftAccessToken } from "./microsoft-auth-service";

const LOCAL_STORAGE_DIR = path.resolve(
  process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), ".local-object-storage"),
);

interface GraphMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  isRead?: boolean;
  flag?: { flagStatus?: string };
}

interface GraphNote {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  categories?: string[];
}

export interface GraphNoteDto {
  id: string;
  title: string;
  body: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  categories: string[];
  colour: string;
  accountId: string;
  externalId: string;
  provider: "microsoft";
  connectedAccountId: string;
}

export interface GraphEmailDto {
  id: string;
  accountId: string;
  connectedAccountId: string;
  folderId: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  unread: boolean;
  starred: boolean;
  flagged: boolean;
  category: string;
  labels: string[];
  externalId: string;
  provider: "microsoft";
}

interface GraphEvent {
  id: string;
  subject?: string;
  bodyPreview?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  isAllDay?: boolean;
  webLink?: string;
}

export interface GraphCalendarItemDto {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  categoryId: string;
  colour: string;
  notes?: string;
  accountId: string;
  externalId: string;
  provider: "microsoft";
  connectedAccountId: string;
  calendarId?: string;
  calendarName?: string;
}

export interface CalendarSyncInput {
  localItemId: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  notes?: string;
  photoStorageKey?: string;
  photoMimeType?: string;
  photoFilename?: string;
  calendarId?: string;
}

export interface GraphContactDto {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  company?: string;
  jobTitle?: string;
  accountId: string;
  connectedAccountId: string;
  externalId: string;
  provider: "microsoft";
}

function accountKeyFromRecord(account: ConnectedAccountRecord): string {
  return `ms-${account.id}`;
}

function folderCompositeId(accountKey: string, graphFolderId: string): string {
  return `${accountKey}-${graphFolderId}`;
}

async function getValidAccessToken(accountId: string): Promise<string> {
  const record = await getConnectedAccountRecord(accountId);
  if (!record) throw new Error("Connected account not found");

  const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : 0;
  const needsRefresh = !record.accessToken || expiresAt - Date.now() < 60_000;

  if (!needsRefresh) return record.accessToken;
  if (!record.refreshToken) throw new Error("Microsoft session expired — reconnect in Settings");

  const refreshed = await refreshMicrosoftAccessToken(accountId, record.refreshToken);
  await updateConnectedAccountTokens(accountId, refreshed);
  return refreshed.accessToken;
}

async function graphFetch(accountId: string, path: string, init?: RequestInit): Promise<Response> {
  const token = await getValidAccessToken(accountId);
  const response = await fetch(`${MICROSOFT_GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Graph request failed (${response.status}): ${detail}`);
  }

  return response;
}

function parseGraphEventDateTime(dateTime: string | undefined): { date: string; time?: string } {
  if (!dateTime) {
    const today = new Date().toISOString().slice(0, 10);
    return { date: today };
  }

  const [datePart, timePart] = dateTime.split("T");
  const time = timePart?.slice(0, 5);
  return { date: datePart, time: time && time !== "00:00" ? time : undefined };
}

function subtractOneDayIso(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - 1);
  return value.toISOString().slice(0, 10);
}

function mapGraphEventToDto(
  event: GraphEvent,
  account: ConnectedAccountRecord,
  calendar?: { id: string; name: string },
): GraphCalendarItemDto {
  const accountKey = accountKeyFromRecord(account);
  const allDay = Boolean(event.isAllDay);
  const start = parseGraphEventDateTime(event.start?.dateTime);
  const end = parseGraphEventDateTime(event.end?.dateTime);

  let endDate: string | undefined;
  if (allDay && end.date > start.date) {
    endDate = subtractOneDayIso(end.date);
  } else if (!allDay && end.date > start.date) {
    endDate = end.date;
  }

  return {
    id: `graph-${event.id}`,
    title: event.subject ?? "(No title)",
    date: start.date,
    endDate,
    startTime: allDay ? undefined : start.time,
    endTime: allDay ? undefined : end.time,
    allDay,
    categoryId: "work",
    colour: "#C45C4A",
    notes: event.bodyPreview,
    accountId: accountKey,
    externalId: event.id,
    provider: "microsoft",
    connectedAccountId: account.id,
    calendarId: calendar?.id,
    calendarName: calendar?.name,
  };
}

export async function fetchMicrosoftCalendars(accountId: string): Promise<GraphCalendarDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const response = await graphFetch(
    accountId,
    "/me/calendars?$select=id,name,isDefaultCalendar&$top=50",
  );
  const payload = (await response.json()) as {
    value?: Array<{ id: string; name?: string; isDefaultCalendar?: boolean }>;
  };
  const accountKey = accountKeyFromRecord(account);

  return (payload.value ?? []).map((calendar) => ({
    id: `${accountKey}-cal-${calendar.id}`,
    graphCalendarId: calendar.id,
    name: calendar.name ?? "Calendar",
    accountId: accountKey,
    connectedAccountId: account.id,
    isDefault: calendar.isDefaultCalendar,
  }));
}

export async function fetchMicrosoftCalendarEvents(
  accountId: string,
  startDate?: string,
  endDate?: string,
  calendarGraphId?: string,
): Promise<GraphCalendarItemDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const start = startDate ?? addDaysIso(new Date().toISOString().slice(0, 10), -30);
  const end = endDate ?? addDaysIso(new Date().toISOString().slice(0, 10), 90);

  const params = new URLSearchParams({
    startDateTime: `${start}T00:00:00`,
    endDateTime: `${end}T23:59:59`,
    $top: "250",
    $orderby: "start/dateTime",
    $select: "id,subject,bodyPreview,start,end,isAllDay,webLink",
  });

  if (calendarGraphId) {
    const calendars = await fetchMicrosoftCalendars(accountId);
    const calendar = calendars.find((entry) => entry.graphCalendarId === calendarGraphId);
    const response = await graphFetch(
      accountId,
      `/me/calendars/${calendarGraphId}/calendarView?${params.toString()}`,
    );
    const payload = (await response.json()) as { value?: GraphEvent[] };
    return (payload.value ?? []).map((event) =>
      mapGraphEventToDto(event, account, {
        id: calendarGraphId,
        name: calendar?.name ?? "Calendar",
      }),
    );
  }

  const calendars = await fetchMicrosoftCalendars(accountId);
  if (calendars.length === 0) {
    const response = await graphFetch(accountId, `/me/calendarView?${params.toString()}`);
    const payload = (await response.json()) as { value?: GraphEvent[] };
    return (payload.value ?? []).map((event) => mapGraphEventToDto(event, account));
  }

  const batches = await Promise.all(
    calendars.map(async (calendar) => {
      const response = await graphFetch(
        accountId,
        `/me/calendars/${calendar.graphCalendarId}/calendarView?${params.toString()}`,
      );
      const payload = (await response.json()) as { value?: GraphEvent[] };
      return (payload.value ?? []).map((event) =>
        mapGraphEventToDto(event, account, {
          id: calendar.graphCalendarId,
          name: calendar.name,
        }),
      );
    }),
  );

  const merged = batches.flat();
  const seen = new Set<string>();
  return merged.filter((event) => {
    const key = `${event.connectedAccountId}:${event.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const WELL_KNOWN_FOLDERS: Array<{
  path: GraphMailFolderDto["wellKnown"];
  label: string;
}> = [
  { path: "inbox", label: "Inbox" },
  { path: "sentitems", label: "Sent Items" },
  { path: "drafts", label: "Drafts" },
  { path: "deleteditems", label: "Deleted Items" },
];

export async function fetchMicrosoftMailFolders(accountId: string): Promise<GraphMailFolderDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const accountKey = accountKeyFromRecord(account);
  const folders: GraphMailFolderDto[] = [];

  for (const wellKnown of WELL_KNOWN_FOLDERS) {
    if (!wellKnown.path) continue;
    try {
      const response = await graphFetch(
        accountId,
        `/me/mailFolders/${wellKnown.path}?$select=id,displayName`,
      );
      const payload = (await response.json()) as { id: string; displayName?: string };
      folders.push({
        id: folderCompositeId(accountKey, payload.id),
        graphFolderId: payload.id,
        label: payload.displayName ?? wellKnown.label,
        accountId: accountKey,
        connectedAccountId: account.id,
        wellKnown: wellKnown.path,
      });
    } catch (error) {
      console.warn(`Failed to load ${wellKnown.path} folder for ${accountId}:`, error);
    }
  }

  return folders;
}

function mapGraphMessageToDto(
  message: GraphMessage,
  account: ConnectedAccountRecord,
  folder: Pick<GraphMailFolderDto, "id" | "graphFolderId">,
): GraphEmailDto {
  const accountKey = accountKeyFromRecord(account);
  return {
    id: `graph-${message.id}`,
    accountId: accountKey,
    connectedAccountId: account.id,
    folderId: folder.id,
    from: message.from?.emailAddress?.name ?? "Unknown",
    fromEmail: message.from?.emailAddress?.address ?? "",
    subject: message.subject ?? "(No subject)",
    preview: message.bodyPreview ?? "",
    body: normalizeEmailBody(
      message.body?.content ?? message.bodyPreview ?? "",
      message.body?.contentType,
    ),
    date: message.receivedDateTime ?? new Date().toISOString(),
    unread: !message.isRead,
    starred: false,
    flagged: message.flag?.flagStatus === "flagged",
    category: "Work",
    labels: ["Outlook"],
    externalId: message.id,
    provider: "microsoft",
  };
}

export async function fetchMicrosoftMessages(
  accountId: string,
  top = 50,
  folderGraphId?: string,
): Promise<GraphEmailDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const folders = await fetchMicrosoftMailFolders(accountId);
  const folder =
    folders.find((entry) => entry.graphFolderId === folderGraphId) ??
    folders.find((entry) => entry.wellKnown === "inbox") ??
    folders[0];
  if (!folder) return [];

  const folderPath = folderGraphId ?? folder.graphFolderId;
  const params = new URLSearchParams({
    $top: String(top),
    $orderby: "receivedDateTime desc",
    $select: "id,subject,bodyPreview,body,from,receivedDateTime,isRead,flag",
  });

  const response = await graphFetch(
    accountId,
    `/me/mailFolders/${folderPath}/messages?${params.toString()}`,
  );
  const payload = (await response.json()) as { value?: GraphMessage[] };

  return (payload.value ?? []).map((message) => mapGraphMessageToDto(message, account, folder));
}

export interface SendMailInput {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

function graphRecipients(addresses: string[]) {
  return addresses
    .map((address) => address.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

export async function sendMicrosoftMail(accountId: string, input: SendMailInput): Promise<void> {
  const toRecipients = graphRecipients(input.to);
  if (toRecipients.length === 0) throw new Error("At least one recipient is required");

  await graphFetch(accountId, "/me/sendMail", {
    method: "POST",
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: { contentType: "Text", content: input.body },
        toRecipients,
        ...(input.cc?.length ? { ccRecipients: graphRecipients(input.cc) } : {}),
        ...(input.bcc?.length ? { bccRecipients: graphRecipients(input.bcc) } : {}),
      },
      saveToSentItems: true,
    }),
  });
}

export async function replyMicrosoftMail(
  accountId: string,
  messageId: string,
  input: { comment: string; replyAll?: boolean },
): Promise<void> {
  const comment = input.comment.trim();
  if (!comment) throw new Error("Reply message is required");

  const endpoint = input.replyAll
    ? `/me/messages/${encodeURIComponent(messageId)}/replyAll`
    : `/me/messages/${encodeURIComponent(messageId)}/reply`;

  await graphFetch(accountId, endpoint, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export async function deleteMicrosoftMail(accountId: string, messageId: string): Promise<void> {
  await graphFetch(accountId, `/me/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
  });
}

interface GraphDriveItem {
  id: string;
  name: string;
  webUrl?: string;
  folder?: Record<string, unknown>;
}

export async function fetchOneDriveFolders(
  accountId: string,
  parentId?: string,
): Promise<GraphDriveItemDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const accountKey = accountKeyFromRecord(account);
  const path = parentId
    ? `/me/drive/items/${encodeURIComponent(parentId)}/children?$select=id,name,webUrl,folder`
    : `/me/drive/root/children?$select=id,name,webUrl,folder`;

  const response = await graphFetch(accountId, path);
  const payload = (await response.json()) as { value?: GraphDriveItem[] };

  return (payload.value ?? [])
    .filter((item) => Boolean(item.folder))
    .map((item) => ({
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      accountId: accountKey,
      connectedAccountId: account.id,
      parentId,
    }));
}

function safeDriveFileName(subject: string): string {
  const cleaned = subject.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").trim();
  return (cleaned.slice(0, 120) || "email") + ".txt";
}

export async function copyEmailToOneDriveFolder(
  accountId: string,
  folderId: string,
  input: { subject: string; from: string; fromEmail: string; date: string; body: string },
): Promise<{ name: string; webUrl?: string }> {
  const fileName = safeDriveFileName(input.subject);
  const content = [
    `From: ${input.from} <${input.fromEmail}>`,
    `Date: ${input.date}`,
    `Subject: ${input.subject}`,
    "",
    input.body,
  ].join("\n");

  const token = await getValidAccessToken(accountId);
  const response = await fetch(
    `${MICROSOFT_GRAPH_BASE}/me/drive/items/${encodeURIComponent(folderId)}:/${encodeURIComponent(fileName)}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: content,
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Graph upload failed (${response.status}): ${detail}`);
  }

  const item = (await response.json()) as { name: string; webUrl?: string };
  return { name: item.name, webUrl: item.webUrl };
}

const OUTLOOK_NOTE_COLOUR = "#FFF4B8";

function noteBodyText(note: GraphNote): string {
  return normalizeEmailBody(note.body?.content ?? note.bodyPreview ?? "", note.body?.contentType);
}

function mapGraphNoteToDto(note: GraphNote, account: ConnectedAccountRecord): GraphNoteDto {
  const accountKey = `ms-${account.id}`;
  const body = noteBodyText(note);
  const title = note.subject?.trim() || body.split("\n")[0]?.slice(0, 80) || "(Untitled note)";

  return {
    id: `graph-note-${note.id}`,
    title,
    body,
    preview: note.bodyPreview ?? body.split("\n")[0] ?? "",
    createdAt: note.createdDateTime ?? new Date().toISOString(),
    updatedAt: note.lastModifiedDateTime ?? note.createdDateTime ?? new Date().toISOString(),
    categories: note.categories ?? [],
    colour: OUTLOOK_NOTE_COLOUR,
    accountId: accountKey,
    externalId: note.id,
    provider: "microsoft",
    connectedAccountId: account.id,
  };
}

export async function fetchMicrosoftNotes(
  accountId: string,
  _top = 100,
): Promise<GraphNoteDto[]> {
  // Microsoft Graph has no stable /me/outlook/notes endpoint.
  // Notes sync is not currently supported; return empty so local notes still work.
  console.warn(`fetchMicrosoftNotes: notes sync not supported for account ${accountId} — returning empty`);
  return [];
}

export async function createMicrosoftNote(
  _accountId: string,
  _input: { title: string; body: string },
): Promise<{ externalId: string }> {
  throw new Error("Microsoft notes sync is not supported in this version.");
}

export async function updateMicrosoftNote(
  _accountId: string,
  _externalId: string,
  _input: { title: string; body: string },
): Promise<void> {
  throw new Error("Microsoft notes sync is not supported in this version.");
}

export async function deleteMicrosoftNote(
  _accountId: string,
  _externalId: string,
): Promise<void> {
  throw new Error("Microsoft notes sync is not supported in this version.");
}

function buildEventPayload(input: CalendarSyncInput): Record<string, unknown> {
  const timeZone = process.env.MICROSOFT_CALENDAR_TIMEZONE ?? "Europe/London";

  if (input.allDay) {
    const end =
      input.endDate && input.endDate > input.date
        ? input.endDate
        : addDaysIso(input.date, 1);
    return {
      subject: input.title,
      body: { contentType: "text", content: input.notes ?? "" },
      start: { dateTime: `${input.date}T00:00:00`, timeZone },
      end: { dateTime: `${end}T00:00:00`, timeZone },
      isAllDay: true,
    };
  }

  const startTime = input.startTime ?? "09:00";
  const endTime = input.endTime ?? input.startTime ?? "10:00";
  return {
    subject: input.title,
    body: { contentType: "text", content: input.notes ?? "" },
    start: { dateTime: `${input.date}T${startTime}:00`, timeZone },
    end: { dateTime: `${input.date}T${endTime}:00`, timeZone },
    isAllDay: false,
  };
}

function addDaysIso(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

async function readLocalAttachmentBuffer(storageKey: string): Promise<Buffer | null> {
  try {
    const segments = storageKey.split("/").filter(Boolean);
    const filePath = path.join(LOCAL_STORAGE_DIR, ...segments);
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

async function attachPhotoToEvent(
  accountId: string,
  eventId: string,
  input: CalendarSyncInput,
): Promise<void> {
  if (!input.photoStorageKey || !input.photoMimeType) return;

  const buffer = await readLocalAttachmentBuffer(input.photoStorageKey);
  if (!buffer) return;

  await graphFetch(accountId, `/me/events/${eventId}/attachments`, {
    method: "POST",
    body: JSON.stringify({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: input.photoFilename ?? "photo.jpg",
      contentType: input.photoMimeType,
      contentBytes: buffer.toString("base64"),
    }),
  });
}

export async function syncCalendarItemToMicrosoft(
  accountId: string,
  input: CalendarSyncInput,
): Promise<GraphCalendarEventResult> {
  const mapping = await getProviderMapping("calendar", input.localItemId);
  const payload = buildEventPayload(input);
  const calendars = await fetchMicrosoftCalendars(accountId);
  const targetCalendar =
    calendars.find((entry) => entry.graphCalendarId === input.calendarId) ??
    calendars.find((entry) => entry.isDefault) ??
    calendars[0];
  const calendarBase = targetCalendar
    ? `/me/calendars/${targetCalendar.graphCalendarId}`
    : "/me/calendar";

  if (mapping && mapping.connectedAccountId === accountId) {
    const response = await graphFetch(accountId, `${calendarBase}/events/${mapping.externalId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const event = (await response.json()) as { id: string; webLink?: string };
    await attachPhotoToEvent(accountId, event.id, input);
    return { externalId: event.id, webLink: event.webLink };
  }

  const response = await graphFetch(accountId, `${calendarBase}/events`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const event = (await response.json()) as { id: string; webLink?: string };

  await upsertProviderMapping({
    connectedAccountId: accountId,
    itemType: "calendar",
    localItemId: input.localItemId,
    externalId: event.id,
  });

  await attachPhotoToEvent(accountId, event.id, input);
  return { externalId: event.id, webLink: event.webLink };
}

export async function fetchMicrosoftTodoLists(accountId: string): Promise<GraphTodoListDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const response = await graphFetch(accountId, "/me/todo/lists?$select=id,displayName,wellknownListName");
  const payload = (await response.json()) as {
    value?: Array<{ id: string; displayName?: string; wellknownListName?: string }>;
  };
  const accountKey = accountKeyFromRecord(account);

  return (payload.value ?? []).map((list) => ({
    id: `${accountKey}-todo-${list.id}`,
    graphListId: list.id,
    name: list.displayName ?? "Tasks",
    accountId: accountKey,
    connectedAccountId: account.id,
    isDefault: list.wellknownListName === "defaultList",
  }));
}

export async function createMicrosoftTodoTask(
  accountId: string,
  input: { title: string; dueDate?: string; notes?: string; todoListId?: string },
): Promise<{ externalId: string }> {
  const lists = await fetchMicrosoftTodoLists(accountId);
  const targetList =
    lists.find((list) => list.graphListId === input.todoListId) ??
    lists.find((list) => list.isDefault) ??
    lists[0];
  if (!targetList) throw new Error("No Microsoft To Do list found");

  const body: Record<string, unknown> = {
    title: input.title,
    body: {
      content: input.notes ?? "",
      contentType: "text",
    },
  };

  if (input.dueDate) {
    body.dueDateTime = {
      dateTime: `${input.dueDate}T00:00:00`,
      timeZone: process.env.MICROSOFT_CALENDAR_TIMEZONE ?? "Europe/London",
    };
  }

  const response = await graphFetch(
    accountId,
    `/me/todo/lists/${targetList.graphListId}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  const task = (await response.json()) as { id: string };
  return { externalId: task.id };
}

interface GraphContact {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  companyName?: string;
  jobTitle?: string;
  emailAddresses?: Array<{ address?: string; name?: string }>;
  businessPhones?: string[];
  mobilePhone?: string;
}

export async function fetchMicrosoftContacts(accountId: string, top = 100): Promise<GraphContactDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const params = new URLSearchParams({
    $top: String(top),
    $orderby: "displayName",
    $select:
      "id,displayName,givenName,surname,companyName,jobTitle,emailAddresses,businessPhones,mobilePhone",
  });

  let response: Response;
  try {
    response = await graphFetch(accountId, `/me/contacts?${params.toString()}`);
  } catch (error) {
    console.warn(`Contacts fetch failed for ${accountId} — reconnect may need Contacts.Read scope:`, error);
    return [];
  }

  const payload = (await response.json()) as { value?: GraphContact[] };
  const accountKey = accountKeyFromRecord(account);

  return (payload.value ?? []).map((contact) => {
    const name =
      contact.displayName?.trim() ||
      [contact.givenName, contact.surname].filter(Boolean).join(" ").trim() ||
      contact.emailAddresses?.[0]?.name ||
      "Unknown contact";
    return {
      id: `graph-contact-${contact.id}`,
      name,
      email: contact.emailAddresses?.[0]?.address,
      phone: contact.businessPhones?.[0],
      mobilePhone: contact.mobilePhone,
      company: contact.companyName,
      jobTitle: contact.jobTitle,
      accountId: accountKey,
      connectedAccountId: account.id,
      externalId: contact.id,
      provider: "microsoft" as const,
    };
  });
}
