import fs from "fs/promises";
import path from "path";
import type { GraphCalendarEventResult } from "../../shared/microsoftGraph";
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

function mapGraphEventToDto(event: GraphEvent, account: ConnectedAccountRecord): GraphCalendarItemDto {
  const accountKey = `ms-${account.id}`;
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
  };
}

export async function fetchMicrosoftCalendarEvents(
  accountId: string,
  startDate?: string,
  endDate?: string,
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

  const response = await graphFetch(accountId, `/me/calendarView?${params.toString()}`);
  const payload = (await response.json()) as { value?: GraphEvent[] };

  return (payload.value ?? []).map((event) => mapGraphEventToDto(event, account));
}

export async function fetchMicrosoftMessages(
  accountId: string,
  top = 50,
): Promise<GraphEmailDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const params = new URLSearchParams({
    $top: String(top),
    $orderby: "receivedDateTime desc",
    $select: "id,subject,bodyPreview,body,from,receivedDateTime,isRead,flag",
  });

  const response = await graphFetch(accountId, `/me/messages?${params.toString()}`);
  const payload = (await response.json()) as { value?: GraphMessage[] };
  const accountKey = `ms-${account.id}`;

  return (payload.value ?? []).map((message) => ({
    id: `graph-${message.id}`,
    accountId: accountKey,
    connectedAccountId: account.id,
    folderId: `${accountKey}-inbox`,
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
  }));
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
  top = 100,
): Promise<GraphNoteDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const params = new URLSearchParams({
    $top: String(top),
    $orderby: "lastModifiedDateTime desc",
    $select: "id,subject,bodyPreview,body,createdDateTime,lastModifiedDateTime,categories",
  });

  const response = await graphFetch(accountId, `/me/outlook/notes?${params.toString()}`);
  const payload = (await response.json()) as { value?: GraphNote[] };

  return (payload.value ?? []).map((note) => mapGraphNoteToDto(note, account));
}

export async function createMicrosoftNote(
  accountId: string,
  input: { title: string; body: string },
): Promise<{ externalId: string }> {
  const response = await graphFetch(accountId, "/me/outlook/notes", {
    method: "POST",
    body: JSON.stringify({
      subject: input.title,
      body: {
        contentType: "Text",
        content: input.body,
      },
    }),
  });
  const note = (await response.json()) as { id: string };
  return { externalId: note.id };
}

export async function updateMicrosoftNote(
  accountId: string,
  externalId: string,
  input: { title: string; body: string },
): Promise<void> {
  await graphFetch(accountId, `/me/outlook/notes/${externalId}`, {
    method: "PATCH",
    body: JSON.stringify({
      subject: input.title,
      body: {
        contentType: "Text",
        content: input.body,
      },
    }),
  });
}

export async function deleteMicrosoftNote(
  accountId: string,
  externalId: string,
): Promise<void> {
  await graphFetch(accountId, `/me/outlook/notes/${externalId}`, {
    method: "DELETE",
  });
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

  if (mapping && mapping.connectedAccountId === accountId) {
    const response = await graphFetch(accountId, `/me/events/${mapping.externalId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const event = (await response.json()) as { id: string; webLink?: string };
    await attachPhotoToEvent(accountId, event.id, input);
    return { externalId: event.id, webLink: event.webLink };
  }

  const response = await graphFetch(accountId, "/me/events", {
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

export async function createMicrosoftTodoTask(
  accountId: string,
  input: { title: string; dueDate?: string; notes?: string },
): Promise<{ externalId: string }> {
  const listsResponse = await graphFetch(accountId, "/me/todo/lists");
  const listsPayload = (await listsResponse.json()) as {
    value?: Array<{ id: string; wellknownListName?: string }>;
  };
  const defaultList =
    listsPayload.value?.find((list) => list.wellknownListName === "defaultList") ??
    listsPayload.value?.[0];
  if (!defaultList) throw new Error("No Microsoft To Do list found");

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

  const response = await graphFetch(accountId, `/me/todo/lists/${defaultList.id}/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const task = (await response.json()) as { id: string };
  return { externalId: task.id };
}
