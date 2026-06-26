import { normalizeEmailBody } from "../../shared/emailBody";
import { getReminderMinutesBefore, minutesToReminderPreset } from "../../shared/reminders";
import type {
  GoogleCalendarDto,
  GoogleCalendarEventResult,
  GoogleCalendarSyncInput,
  GoogleDriveFolderDto,
  GoogleMailFolderDto,
} from "../../shared/googleApi";
import {
  type ConnectedAccountRecord,
  getConnectedAccountRecord,
  getProviderMapping,
  updateConnectedAccountTokens,
  upsertProviderMapping,
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
  reminderPreset?: string;
  reminderCustomMinutes?: number;
  reminderAt?: string;
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
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method?: string; minutes?: number }>;
  };
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
    ...(event.reminders?.overrides?.[0]?.minutes != null
      ? minutesToReminderPreset(event.reminders.overrides[0].minutes)
      : {}),
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

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

export interface SendGoogleMailInput {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
}

function encodeRawEmail(content: string): string {
  return Buffer.from(content).toString("base64url");
}

function buildPlainEmail(input: {
  from: string;
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  inReplyTo?: string;
  references?: string;
}): string {
  const lines = [`From: ${input.from}`, `To: ${input.to.join(", ")}`];
  if (input.cc?.length) lines.push(`Cc: ${input.cc.join(", ")}`);
  if (input.inReplyTo) lines.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references) lines.push(`References: ${input.references}`);
  lines.push(`Subject: ${input.subject}`);
  lines.push("MIME-Version: 1.0");
  lines.push("Content-Type: text/plain; charset=utf-8");
  lines.push("");
  lines.push(input.body);
  return encodeRawEmail(lines.join("\r\n"));
}

function parseAddressList(value: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => parseFromHeader(part.trim()).email)
    .filter(Boolean);
}

async function fetchGmailMessage(accountId: string, messageId: string): Promise<GmailMessage> {
  const response = await googleFetch(
    accountId,
    `${GMAIL_API_BASE}/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
  );
  return response.json() as Promise<GmailMessage>;
}

export async function sendGoogleMail(
  accountId: string,
  input: SendGoogleMailInput,
): Promise<void> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const to = input.to.map((entry) => entry.trim()).filter(Boolean);
  if (to.length === 0) throw new Error("At least one recipient is required");

  const raw = buildPlainEmail({
    from: account.email,
    to,
    subject: input.subject,
    body: input.body,
    cc: input.cc?.map((entry) => entry.trim()).filter(Boolean),
  });

  await googleFetch(accountId, `${GMAIL_API_BASE}/users/me/messages/send`, {
    method: "POST",
    body: JSON.stringify({ raw }),
  });
}

export async function replyGoogleMail(
  accountId: string,
  messageId: string,
  input: { comment: string; replyAll?: boolean },
): Promise<void> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const comment = input.comment.trim();
  if (!comment) throw new Error("Reply message is required");

  const original = await fetchGmailMessage(accountId, messageId);
  const headers = original.payload?.headers;
  const messageIdHeader = getGmailHeader(headers, "Message-Id");
  const subject = getGmailHeader(headers, "Subject") || "(No subject)";
  const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;

  let to = [parseFromHeader(getGmailHeader(headers, "From")).email].filter(Boolean);
  if (input.replyAll) {
    const participants = [
      ...parseAddressList(getGmailHeader(headers, "To")),
      ...parseAddressList(getGmailHeader(headers, "Cc")),
      parseFromHeader(getGmailHeader(headers, "From")).email,
    ];
    const self = account.email.toLowerCase();
    to = [...new Set(participants.map((entry) => entry.toLowerCase()))]
      .filter((entry) => entry && entry !== self)
      .map((entry) => participants.find((p) => p.toLowerCase() === entry) ?? entry);
  }

  if (to.length === 0) throw new Error("No reply recipients found");

  const raw = buildPlainEmail({
    from: account.email,
    to,
    subject: replySubject,
    body: comment,
    inReplyTo: messageIdHeader || undefined,
    references: messageIdHeader || undefined,
  });

  await googleFetch(accountId, `${GMAIL_API_BASE}/users/me/messages/send`, {
    method: "POST",
    body: JSON.stringify({
      raw,
      threadId: original.threadId,
    }),
  });
}

export async function deleteGoogleMail(accountId: string, messageId: string): Promise<void> {
  await googleFetch(
    accountId,
    `${GMAIL_API_BASE}/users/me/messages/${encodeURIComponent(messageId)}/trash`,
    { method: "POST" },
  );
}

export async function fetchGoogleDriveFolders(
  accountId: string,
  parentId?: string,
): Promise<GoogleDriveFolderDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const accountKey = accountKeyFromRecord(account);
  const parent = parentId ?? "root";
  const params = new URLSearchParams({
    q: `'${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name,webViewLink)",
    pageSize: "100",
    orderBy: "name",
  });

  const response = await googleFetch(
    accountId,
    `${DRIVE_API_BASE}/files?${params.toString()}`,
  );
  const payload = (await response.json()) as {
    files?: Array<{ id: string; name?: string; webViewLink?: string }>;
  };

  return (payload.files ?? []).map((folder) => ({
    id: folder.id,
    name: folder.name ?? "Folder",
    webUrl: folder.webViewLink,
    accountId: accountKey,
    connectedAccountId: account.id,
    parentId,
  }));
}

function safeDriveFileName(subject: string): string {
  const cleaned = subject.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").trim();
  return (cleaned.slice(0, 120) || "email") + ".txt";
}

export async function copyEmailToGoogleDriveFolder(
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

  const metadata = {
    name: fileName,
    mimeType: "text/plain",
    parents: [folderId],
  };

  const boundary = `myaxis-${randomBoundary()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");

  const token = await getValidGoogleAccessToken(accountId);
  const response = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,webViewLink`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Drive upload failed (${response.status}): ${detail}`);
  }

  const item = (await response.json()) as { name: string; webViewLink?: string };
  return { name: item.name, webUrl: item.webViewLink };
}

const MYAXIS_LOCAL_ITEM_PROPERTY = "myaxisLocalItemId";

function hasExplicitScheduleTime(input: {
  startTime?: string;
  endTime?: string;
}): boolean {
  return Boolean(input.startTime?.trim() || input.endTime?.trim());
}

function buildGoogleEventPayload(input: GoogleCalendarSyncInput): Record<string, unknown> {
  const timeZone =
    input.timeZone ?? process.env.GOOGLE_CALENDAR_TIMEZONE ?? "Europe/London";
  const allDay = input.allDay || !hasExplicitScheduleTime(input);

  if (allDay) {
    const exclusiveEnd =
      input.endDate && input.endDate >= input.date
        ? addDaysIso(input.endDate, 1)
        : addDaysIso(input.date, 1);
    return {
      summary: input.title,
      description: input.notes ?? "",
      start: { date: input.date },
      end: { date: exclusiveEnd },
      ...(getReminderMinutesBefore(input) != null
        ? {
            reminders: {
              useDefault: false,
              overrides: [{ method: "popup", minutes: getReminderMinutesBefore(input)! }],
            },
          }
        : {}),
    };
  }

  const startTime = input.startTime!;
  const endTime = input.endTime ?? input.startTime ?? startTime;
  const endDate = input.endDate && input.endDate > input.date ? input.endDate : input.date;

  const payload: Record<string, unknown> = {
    summary: input.title,
    description: input.notes ?? "",
    start: { dateTime: `${input.date}T${startTime}:00`, timeZone },
    end: { dateTime: `${endDate}T${endTime}:00`, timeZone },
  };

  const minutes = getReminderMinutesBefore(input);
  if (minutes != null) {
    payload.reminders = {
      useDefault: false,
      overrides: [{ method: "popup", minutes }],
    };
  }

  return payload;
}

function withMyAxisExtendedProperties(
  payload: Record<string, unknown>,
  localItemId: string,
): Record<string, unknown> {
  return {
    ...payload,
    extendedProperties: {
      private: {
        [MYAXIS_LOCAL_ITEM_PROPERTY]: localItemId,
      },
    },
  };
}

export async function syncCalendarItemToGoogle(
  accountId: string,
  input: GoogleCalendarSyncInput,
): Promise<GoogleCalendarEventResult> {
  const mapping = await getProviderMapping("calendar", input.localItemId);
  const basePayload = buildGoogleEventPayload(input);
  const calendars = await fetchGoogleCalendars(accountId);
  const targetCalendar =
    calendars.find((entry) => entry.googleCalendarId === input.calendarId) ??
    calendars.find((entry) => entry.isDefault) ??
    calendars[0];
  const calendarId = targetCalendar?.googleCalendarId ?? "primary";
  const eventsBase = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;

  if (mapping && mapping.connectedAccountId === accountId) {
    const payload = withMyAxisExtendedProperties(basePayload, input.localItemId);
    const response = await googleFetch(
      accountId,
      `${eventsBase}/${encodeURIComponent(mapping.externalId)}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
    const event = (await response.json()) as { id: string; htmlLink?: string };
    return { externalId: event.id, htmlLink: event.htmlLink };
  }

  const payload = withMyAxisExtendedProperties(basePayload, input.localItemId);
  const response = await googleFetch(accountId, eventsBase, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const event = (await response.json()) as { id: string; htmlLink?: string };

  await upsertProviderMapping({
    connectedAccountId: accountId,
    itemType: "calendar",
    localItemId: input.localItemId,
    externalId: event.id,
  });

  return { externalId: event.id, htmlLink: event.htmlLink };
}

function randomBoundary(): string {
  return Math.random().toString(36).slice(2);
}
