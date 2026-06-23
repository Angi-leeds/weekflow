import fs from "fs/promises";
import path from "path";
import type { GraphCalendarEventResult } from "../../shared/microsoftGraph";
import { MICROSOFT_GRAPH_BASE } from "../../shared/microsoftGraph";
import {
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

export async function fetchMicrosoftMessages(
  accountId: string,
  top = 25,
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
    body: message.body?.content ?? message.bodyPreview ?? "",
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
