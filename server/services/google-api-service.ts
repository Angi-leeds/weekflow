import { normalizeEmailBody } from "../../shared/emailBody";
import type { GoogleMailFolderDto } from "../../shared/googleApi";
import {
  type ConnectedAccountRecord,
  getConnectedAccountRecord,
  updateConnectedAccountTokens,
} from "./connected-account-service";
import { refreshGoogleAccessToken } from "./google-auth-service";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export interface GoogleEmailDto {
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
  provider: "google";
}

export interface GoogleCalendarItemDto {
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
  provider: "google";
  connectedAccountId: string;
  calendarId?: string;
  calendarName?: string;
}

export interface GoogleCalendarDto {
  id: string;
  googleCalendarId: string;
  name: string;
  accountId: string;
  connectedAccountId: string;
  isDefault?: boolean;
}

const WELL_KNOWN_LABELS: Array<{
  labelId: string;
  label: string;
  wellKnown: GoogleMailFolderDto["wellKnown"];
}> = [
  { labelId: "INBOX", label: "Inbox", wellKnown: "inbox" },
  { labelId: "SENT", label: "Sent", wellKnown: "sentitems" },
  { labelId: "DRAFT", label: "Drafts", wellKnown: "drafts" },
  { labelId: "TRASH", label: "Trash", wellKnown: "deleteditems" },
];

function accountKeyFromRecord(account: ConnectedAccountRecord): string {
  return `google-${account.id}`;
}

function folderCompositeId(accountKey: string, labelId: string): string {
  return `${accountKey}-${labelId}`;
}

function addDaysIso(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

async function getValidGoogleAccessToken(accountId: string): Promise<string> {
  const record = await getConnectedAccountRecord(accountId);
  if (!record) throw new Error("Connected account not found");
  if (record.provider !== "google") throw new Error("Not a Google connected account");

  const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : 0;
  const needsRefresh = !record.accessToken || expiresAt - Date.now() < 60_000;

  if (!needsRefresh) return record.accessToken;
  if (!record.refreshToken) throw new Error("Google session expired — reconnect in Settings");

  const refreshed = await refreshGoogleAccessToken(record.refreshToken);
  await updateConnectedAccountTokens(accountId, refreshed);
  return refreshed.accessToken;
}

async function googleFetch(
  accountId: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getValidGoogleAccessToken(accountId);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google API request failed (${response.status}): ${detail}`);
  }

  return response;
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

interface GmailHeader {
  name?: string;
  value?: string;
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

interface GmailMessage {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailPart[];
  };
}

function getGmailHeader(headers: GmailHeader[] | undefined, name: string): string {
  return (
    headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
  );
}

function parseFromHeader(value: string): { name: string; email: string } {
  const angleMatch = value.match(/^(.+?)\s*<([^>]+)>$/);
  if (angleMatch) {
    return {
      name: angleMatch[1].replace(/^"|"$/g, "").trim() || angleMatch[2],
      email: angleMatch[2].trim(),
    };
  }
  if (value.includes("@")) {
    return { name: value, email: value };
  }
  return { name: value || "Unknown", email: "" };
}

function extractGmailBody(payload: GmailPart | undefined): string {
  if (!payload) return "";
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts?.length) {
    const plain = payload.parts.find((part) => part.mimeType === "text/plain");
    if (plain) {
      const body = extractGmailBody(plain);
      if (body) return body;
    }
    const html = payload.parts.find((part) => part.mimeType === "text/html");
    if (html) {
      const body = extractGmailBody(html);
      if (body) return body;
    }
    for (const part of payload.parts) {
      const nested = extractGmailBody(part);
      if (nested) return nested;
    }
  }
  return "";
}

function mapGmailMessageToDto(
  message: GmailMessage,
  account: ConnectedAccountRecord,
  folder: Pick<GoogleMailFolderDto, "id" | "labelId">,
): GoogleEmailDto {
  const accountKey = accountKeyFromRecord(account);
  const headers = message.payload?.headers;
  const fromHeader = getGmailHeader(headers, "From");
  const from = parseFromHeader(fromHeader);
  const rawBody = extractGmailBody(message.payload) || message.snippet || "";
  const mimeType = message.payload?.mimeType;
  const labelIds = message.labelIds ?? [];

  return {
    id: `gmail-${message.id}`,
    accountId: accountKey,
    connectedAccountId: account.id,
    folderId: folder.id,
    from: from.name,
    fromEmail: from.email,
    subject: getGmailHeader(headers, "Subject") || "(No subject)",
    preview: message.snippet ?? "",
    body: normalizeEmailBody(rawBody, mimeType?.includes("html") ? "html" : "text"),
    date: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : new Date().toISOString(),
    unread: labelIds.includes("UNREAD"),
    starred: labelIds.includes("STARRED"),
    flagged: labelIds.includes("IMPORTANT"),
    category: "Work",
    labels: ["Gmail"],
    externalId: message.id,
    provider: "google",
  };
}

export async function fetchGoogleMailFolders(accountId: string): Promise<GoogleMailFolderDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const accountKey = accountKeyFromRecord(account);
  return WELL_KNOWN_LABELS.map((entry) => ({
    id: folderCompositeId(accountKey, entry.labelId),
    labelId: entry.labelId,
    label: entry.label,
    accountId: accountKey,
    connectedAccountId: account.id,
    wellKnown: entry.wellKnown,
  }));
}

export async function fetchGoogleMessages(
  accountId: string,
  top = 50,
  labelId = "INBOX",
): Promise<GoogleEmailDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const folders = await fetchGoogleMailFolders(accountId);
  const folder =
    folders.find((entry) => entry.labelId === labelId) ??
    folders.find((entry) => entry.wellKnown === "inbox") ??
    folders[0];
  if (!folder) return [];

  const params = new URLSearchParams({
    labelIds: folder.labelId,
    maxResults: String(top),
  });

  const listResponse = await googleFetch(
    accountId,
    `${GMAIL_API_BASE}/users/me/messages?${params.toString()}`,
  );
  const listPayload = (await listResponse.json()) as { messages?: Array<{ id: string }> };
  const messageIds = (listPayload.messages ?? []).map((entry) => entry.id).slice(0, top);
  if (messageIds.length === 0) return [];

  const messages = await Promise.all(
    messageIds.map(async (id) => {
      const response = await googleFetch(
        accountId,
        `${GMAIL_API_BASE}/users/me/messages/${encodeURIComponent(id)}?format=full`,
      );
      return response.json() as Promise<GmailMessage>;
    }),
  );

  return messages.map((message) => mapGmailMessageToDto(message, account, folder));
}

interface GoogleCalendarListEntry {
  id: string;
  summary?: string;
  primary?: boolean;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
}

function parseGoogleEventDateTime(value?: { date?: string; dateTime?: string }): {
  date: string;
  time?: string;
} {
  if (value?.date) {
    return { date: value.date };
  }
  if (value?.dateTime) {
    const [datePart, timePart] = value.dateTime.split("T");
    const time = timePart?.slice(0, 5);
    return { date: datePart, time: time && time !== "00:00" ? time : undefined };
  }
  return { date: new Date().toISOString().slice(0, 10) };
}

function subtractOneDayIso(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - 1);
  return value.toISOString().slice(0, 10);
}

function mapGoogleEventToDto(
  event: GoogleCalendarEvent,
  account: ConnectedAccountRecord,
  calendar?: { id: string; name: string },
): GoogleCalendarItemDto {
  const accountKey = accountKeyFromRecord(account);
  const allDay = Boolean(event.start?.date);
  const start = parseGoogleEventDateTime(event.start);
  const end = parseGoogleEventDateTime(event.end);

  let endDate: string | undefined;
  if (allDay && end.date > start.date) {
    endDate = subtractOneDayIso(end.date);
  } else if (!allDay && end.date > start.date) {
    endDate = end.date;
  }

  return {
    id: `gcal-${event.id}`,
    title: event.summary ?? "(No title)",
    date: start.date,
    endDate,
    startTime: allDay ? undefined : start.time,
    endTime: allDay ? undefined : end.time,
    allDay,
    categoryId: "work",
    colour: "#4285F4",
    notes: event.description,
    accountId: accountKey,
    externalId: event.id,
    provider: "google",
    connectedAccountId: account.id,
    calendarId: calendar?.id,
    calendarName: calendar?.name,
  };
}

export async function fetchGoogleCalendars(accountId: string): Promise<GoogleCalendarDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const response = await googleFetch(
    accountId,
    `${CALENDAR_API_BASE}/users/me/calendarList?maxResults=50`,
  );
  const payload = (await response.json()) as { items?: GoogleCalendarListEntry[] };
  const accountKey = accountKeyFromRecord(account);

  return (payload.items ?? []).map((calendar) => ({
    id: `${accountKey}-cal-${calendar.id}`,
    googleCalendarId: calendar.id,
    name: calendar.summary ?? "Calendar",
    accountId: accountKey,
    connectedAccountId: account.id,
    isDefault: calendar.primary,
  }));
}

export async function fetchGoogleCalendarEvents(
  accountId: string,
  startDate?: string,
  endDate?: string,
  googleCalendarId?: string,
): Promise<GoogleCalendarItemDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const start = startDate ?? addDaysIso(new Date().toISOString().slice(0, 10), -30);
  const end = endDate ?? addDaysIso(new Date().toISOString().slice(0, 10), 90);
  const timeMin = `${start}T00:00:00Z`;
  const timeMax = `${end}T23:59:59Z`;

  const fetchEventsForCalendar = async (calendar: GoogleCalendarDto) => {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    const response = await googleFetch(
      accountId,
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendar.googleCalendarId)}/events?${params.toString()}`,
    );
    const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
    return (payload.items ?? []).map((event) =>
      mapGoogleEventToDto(event, account, {
        id: calendar.googleCalendarId,
        name: calendar.name,
      }),
    );
  };

  if (googleCalendarId) {
    const calendars = await fetchGoogleCalendars(accountId);
    const calendar = calendars.find((entry) => entry.googleCalendarId === googleCalendarId);
    if (!calendar) return [];
    return fetchEventsForCalendar(calendar);
  }

  const calendars = await fetchGoogleCalendars(accountId);
  if (calendars.length === 0) return [];

  const batches = await Promise.all(calendars.map((calendar) => fetchEventsForCalendar(calendar)));
  const merged = batches.flat();
  const seen = new Set<string>();
  return merged.filter((event) => {
    const key = `${event.connectedAccountId}:${event.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
