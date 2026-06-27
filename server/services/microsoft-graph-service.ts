import type {
  GraphCalendarDto,
  GraphCalendarEventResult,
  GraphDriveItemDto,
  GraphMailFolderDto,
  GraphMailAttachmentDto,
  GraphTodoListDto,
  OutlookCategoryDto,
} from "../../shared/microsoftGraph";
import { outlookPresetToHex, OUTLOOK_ORPHAN_CATEGORY_HEX } from "../../shared/outlookCategoryColors";
import { normalizeEmailBody } from "../../shared/emailBody";
import {
  getReminderDateTimeForSync,
  getReminderMinutesBefore,
  minutesToReminderPreset,
} from "../../shared/reminders";
import type { ItemRecurrence } from "../../shared/itemRecurrence";
import {
  buildMicrosoftGraphRecurrence,
  importRecurrenceKindFromGraph,
} from "../../shared/recurrenceSync";
import { MICROSOFT_GRAPH_BASE } from "../../shared/microsoftGraph";
import {
  type ConnectedAccountRecord,
  getConnectedAccountRecord,
  getProviderMapping,
  updateConnectedAccountTokens,
  upsertProviderMapping,
} from "./connected-account-service";
import { refreshMicrosoftAccessToken } from "./microsoft-auth-service";
import { readAttachmentBuffer } from "./storage-service";

interface GraphMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  isRead?: boolean;
  flag?: { flagStatus?: string };
  hasAttachments?: boolean;
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
  onlineMeeting?: { joinUrl?: string };
  recurrence?: Record<string, unknown>;
  attendees?: Array<{ emailAddress?: { address?: string }; status?: { response?: string } }>;
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
  categories?: string[];
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
  completed?: boolean;
  accountId: string;
  externalId: string;
  provider: "microsoft";
  connectedAccountId: string;
  calendarId?: string;
  calendarName?: string;
  todoListId?: string;
  attendees?: string[];
  recurringWeekly?: boolean;
  recurrence?: ItemRecurrence;
  teamsMeeting?: boolean;
  onlineMeetingUrl?: string;
  inviteResponse?: "accepted" | "declined" | "tentativelyAccepted" | "none";
  reminderPreset?: string;
  reminderCustomMinutes?: number;
  reminderAt?: string;
  outlookCategories?: string[];
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
  externalId?: string;
  attendees?: string[];
  recurringWeekly?: boolean;
  recurrence?: ItemRecurrence;
  teamsMeeting?: boolean;
  reminderPreset?: string;
  reminderCustomMinutes?: number;
  reminderAt?: string;
  timeZone?: string;
  categories?: string[];
}

export interface TodoSyncInput {
  localItemId: string;
  title: string;
  dueDate?: string;
  startTime?: string;
  allDay?: boolean;
  notes?: string;
  todoListId?: string;
  externalId?: string;
  completed?: boolean;
  reminderPreset?: string;
  reminderCustomMinutes?: number;
  reminderAt?: string;
}

export interface GraphContactDto {
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
}

function accountKeyFromRecord(account: ConnectedAccountRecord): string {
  return `ms-${account.id}`;
}

function folderCompositeId(accountKey: string, graphFolderId: string): string {
  return `${accountKey}-${graphFolderId}`;
}

/** Graph OData values must keep literal commas, slashes, etc. inside $select/$orderby. */
function encodeODataValue(value: string): string {
  return encodeURIComponent(value)
    .replace(/%2C/gi, ",")
    .replace(/%2F/gi, "/")
    .replace(/%28/gi, "(")
    .replace(/%29/gi, ")")
    .replace(/%27/gi, "'")
    .replace(/%3A/gi, ":");
}

/** Build a Graph query string without URLSearchParams (which encodes $ as %24). */
function buildGraphQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => {
      const encodedValue = key.startsWith("$") ? encodeODataValue(value) : encodeURIComponent(value);
      return `${key}=${encodedValue}`;
    })
    .join("&");
}

function encodeGraphPathSegment(id: string): string {
  return encodeURIComponent(id);
}

const GRAPH_MAX_CONCURRENT_PER_ACCOUNT = 2;
const GRAPH_MAX_RETRIES = 4;
const GRAPH_REQUEST_TIMEOUT_MS = 25_000;

const graphSlots = new Map<string, { active: number; queue: Array<() => void> }>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

function getGraphSlotState(accountId: string) {
  let state = graphSlots.get(accountId);
  if (!state) {
    state = { active: 0, queue: [] };
    graphSlots.set(accountId, state);
  }
  return state;
}

async function acquireGraphSlot(accountId: string): Promise<void> {
  const state = getGraphSlotState(accountId);
  if (state.active < GRAPH_MAX_CONCURRENT_PER_ACCOUNT) {
    state.active += 1;
    return;
  }

  await new Promise<void>((resolve) => {
    state.queue.push(resolve);
  });
  state.active += 1;
}

function releaseGraphSlot(accountId: string): void {
  const state = getGraphSlotState(accountId);
  state.active -= 1;
  const next = state.queue.shift();
  if (next) next();
}

function parseRetryAfterMs(response: Response): number | null {
  const header = response.headers.get("Retry-After");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

function isRetryableGraphStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 504;
}

function isGraphThrottleError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("(429)") ||
    message.includes("ApplicationThrottled") ||
    message.includes("MailboxConcurrency")
  );
}

async function getValidAccessToken(accountId: string): Promise<string> {
  const record = await getConnectedAccountRecord(accountId);
  if (!record) throw new Error("Connected account not found");

  const expiresAt = record.expiresAt ? new Date(record.expiresAt).getTime() : 0;
  const needsRefresh = !record.accessToken || expiresAt - Date.now() < 60_000;

  if (!needsRefresh) return record.accessToken;
  if (!record.refreshToken) throw new Error("Microsoft session expired — reconnect in Settings");

  const refreshed = await refreshMicrosoftAccessToken(
    accountId,
    record.refreshToken,
    record.scopes,
  );
  await updateConnectedAccountTokens(accountId, refreshed);
  return refreshed.accessToken;
}

async function graphFetch(accountId: string, path: string, init?: RequestInit): Promise<Response> {
  await acquireGraphSlot(accountId);

  try {
    for (let attempt = 1; attempt <= GRAPH_MAX_RETRIES; attempt += 1) {
      const token = await getValidAccessToken(accountId);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GRAPH_REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(`${MICROSOFT_GRAPH_BASE}${path}`, {
          ...init,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...init?.headers,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`Graph request timed out after ${GRAPH_REQUEST_TIMEOUT_MS}ms: ${path}`);
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }

      if (response.ok) {
        return response;
      }

      const detail = await response.text();
      const retryable = isRetryableGraphStatus(response.status) && attempt < GRAPH_MAX_RETRIES;

      if (retryable) {
        const retryAfter =
          parseRetryAfterMs(response) ?? Math.min(1000 * 2 ** (attempt - 1), 30_000);
        console.warn(
          `Graph throttled (${response.status}) for ${path} — retry ${attempt}/${GRAPH_MAX_RETRIES} in ${retryAfter}ms`,
        );
        await sleep(retryAfter);
        continue;
      }

      throw new Error(`Graph request failed (${response.status}): ${detail}`);
    }

    throw new Error("Graph request failed after retries");
  } finally {
    releaseGraphSlot(accountId);
  }
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

function resolveOutlookEventCategory(
  eventCategories: string[] | undefined,
  masterCategories: OutlookCategoryDto[],
): { categoryId: string; colour: string; outlookCategories?: string[] } {
  const names = (eventCategories ?? []).filter(Boolean);
  const primary = names[0];
  if (!primary) {
    return { categoryId: "work", colour: "#C45C4A", outlookCategories: names.length ? names : undefined };
  }
  const matched = masterCategories.find(
    (entry) => entry.displayName.toLowerCase() === primary.toLowerCase(),
  );
  if (matched) {
    return {
      categoryId: `outlook-${matched.id}`,
      colour: outlookPresetToHex(matched.color),
      outlookCategories: names,
    };
  }
  return {
    categoryId: `outlook-name-${primary.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    colour: OUTLOOK_ORPHAN_CATEGORY_HEX,
    outlookCategories: names,
  };
}

function mapGraphEventToDto(
  event: GraphEvent,
  account: ConnectedAccountRecord,
  calendar?: { id: string; name: string },
  masterCategories: OutlookCategoryDto[] = [],
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

  const category = resolveOutlookEventCategory(event.categories, masterCategories);

  return {
    id: `graph-${event.id}`,
    title: event.subject ?? "(No title)",
    date: start.date,
    endDate,
    startTime: allDay ? undefined : start.time,
    endTime: allDay ? undefined : end.time,
    allDay,
    categoryId: category.categoryId,
    colour: category.colour,
    outlookCategories: category.outlookCategories,
    notes: event.bodyPreview,
    accountId: accountKey,
    externalId: event.id,
    provider: "microsoft",
    connectedAccountId: account.id,
    calendarId: calendar?.id,
    calendarName: calendar?.name,
    attendees: event.attendees
      ?.map((entry) => entry.emailAddress?.address)
      .filter(Boolean) as string[] | undefined,
    recurringWeekly: Boolean(event.recurrence),
    recurrence: importRecurrenceKindFromGraph(event.recurrence?.pattern),
    teamsMeeting: Boolean(event.onlineMeeting?.joinUrl),
    onlineMeetingUrl: event.onlineMeeting?.joinUrl,
    inviteResponse: mapInviteResponse(event.attendees),
    ...(event.isReminderOn && event.reminderMinutesBeforeStart != null
      ? minutesToReminderPreset(event.reminderMinutesBeforeStart)
      : {}),
  };
}

function mapInviteResponse(
  attendees?: Array<{ status?: { response?: string } }>,
): GraphCalendarItemDto["inviteResponse"] {
  const self = attendees?.find((entry) => entry.status?.response);
  const response = self?.status?.response;
  if (response === "accepted") return "accepted";
  if (response === "declined") return "declined";
  if (response === "tentativelyAccepted") return "tentativelyAccepted";
  return "none";
}

interface GraphCalendarRow {
  id: string;
  name?: string;
  isDefaultCalendar?: boolean;
  hexColor?: string;
  canEdit?: boolean;
  owner?: { name?: string; address?: string };
}

function classifyMicrosoftCalendarKind(
  calendar: GraphCalendarRow,
  accountEmail: string,
): GraphCalendarDto["kind"] {
  const ownerEmail = calendar.owner?.address?.toLowerCase();
  const selfEmail = accountEmail.toLowerCase();
  if (ownerEmail && ownerEmail !== selfEmail) return "shared";
  if (calendar.canEdit === false) return "subscribed";
  return "owned";
}

function mapGraphCalendarRow(
  calendar: GraphCalendarRow,
  account: ConnectedAccountRecord,
  options?: { sharedMailboxEmail?: string },
): GraphCalendarDto {
  const accountKey = accountKeyFromRecord(account);
  return {
    id: `${accountKey}-cal-${calendar.id}`,
    graphCalendarId: calendar.id,
    name: calendar.name ?? "Calendar",
    accountId: accountKey,
    connectedAccountId: account.id,
    isDefault: calendar.isDefaultCalendar,
    colour: calendar.hexColor,
    canEdit: calendar.canEdit,
    ownerName: calendar.owner?.name,
    ownerEmail: calendar.owner?.address,
    kind: classifyMicrosoftCalendarKind(calendar, account.email),
    sharedMailboxEmail: options?.sharedMailboxEmail,
  };
}

async function fetchGraphCalendarPage(
  accountId: string,
  path: string,
): Promise<GraphCalendarRow[]> {
  const rows: GraphCalendarRow[] = [];
  let nextUrl: string | null = path;

  while (nextUrl) {
    const response = await graphFetch(accountId, nextUrl);
    const payload = (await response.json()) as {
      value?: GraphCalendarRow[];
      "@odata.nextLink"?: string;
    };
    rows.push(...(payload.value ?? []));
    nextUrl = payload["@odata.nextLink"]
      ? payload["@odata.nextLink"].replace(MICROSOFT_GRAPH_BASE, "")
      : null;
  }

  return rows;
}

export async function fetchMicrosoftCalendars(accountId: string): Promise<GraphCalendarDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const rows = await fetchGraphCalendarPage(
    accountId,
    "/me/calendars?$select=id,name,isDefaultCalendar,hexColor,canEdit,owner&$top=50",
  );

  return rows.map((calendar) => mapGraphCalendarRow(calendar, account));
}

export async function fetchSharedMailboxCalendars(
  accountId: string,
  sharedMailboxEmail: string,
): Promise<GraphCalendarDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const rows = await fetchGraphCalendarPage(
    accountId,
    `/users/${encodeURIComponent(sharedMailboxEmail)}/calendars?$select=id,name,isDefaultCalendar,hexColor,canEdit,owner&$top=50`,
  );

  return rows.map((calendar) =>
    mapGraphCalendarRow(calendar, account, { sharedMailboxEmail }),
  );
}

export async function fetchMicrosoftCalendarEvents(
  accountId: string,
  startDate?: string,
  endDate?: string,
  calendarGraphId?: string,
  options?: { defaultOnly?: boolean; calendars?: GraphCalendarDto[] },
): Promise<GraphCalendarItemDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const masterCategories = await fetchOutlookMasterCategories(accountId);

  const start = startDate ?? addDaysIso(new Date().toISOString().slice(0, 10), -30);
  const end = endDate ?? addDaysIso(new Date().toISOString().slice(0, 10), 90);

  const query = buildGraphQuery({
    startDateTime: `${start}T00:00:00`,
    endDateTime: `${end}T23:59:59`,
    $top: "250",
    $orderby: "start/dateTime",
    $select: "id,subject,bodyPreview,start,end,isAllDay,webLink,isReminderOn,reminderMinutesBeforeStart,categories",
  });

  if (calendarGraphId) {
    const calendars = options?.calendars ?? (await fetchMicrosoftCalendars(accountId));
    const calendar = calendars.find((entry) => entry.graphCalendarId === calendarGraphId);
    const response = await graphFetch(
      accountId,
      `/me/calendars/${encodeGraphPathSegment(calendarGraphId)}/calendarView?${query}`,
    );
    const payload = (await response.json()) as { value?: GraphEvent[] };
    return (payload.value ?? []).map((event) =>
      mapGraphEventToDto(
        event,
        account,
        {
          id: calendarGraphId,
          name: calendar?.name ?? "Calendar",
        },
        masterCategories,
      ),
    );
  }

  const calendars = options?.calendars ?? (await fetchMicrosoftCalendars(accountId));
  if (calendars.length === 0) {
    const response = await graphFetch(accountId, `/me/calendarView?${query}`);
    const payload = (await response.json()) as { value?: GraphEvent[] };
    return (payload.value ?? []).map((event) =>
      mapGraphEventToDto(event, account, undefined, masterCategories),
    );
  }

  const orderedCalendars = [...calendars].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });

  const calendarsToFetch = options?.defaultOnly
    ? orderedCalendars.filter((calendar) => calendar.isDefault).slice(0, 1)
    : orderedCalendars;
  const targetCalendars =
    calendarsToFetch.length > 0 ? calendarsToFetch : orderedCalendars.slice(0, 1);

  const batches: GraphCalendarItemDto[][] = [];

  await runWithConcurrency(targetCalendars, GRAPH_MAX_CONCURRENT_PER_ACCOUNT, async (calendar) => {
    try {
      const response = await graphFetch(
        accountId,
        `/me/calendars/${encodeGraphPathSegment(calendar.graphCalendarId)}/calendarView?${query}`,
      );
      const payload = (await response.json()) as { value?: GraphEvent[] };
      batches.push(
        (payload.value ?? []).map((event) =>
          mapGraphEventToDto(
            event,
            account,
            {
              id: calendar.graphCalendarId,
              name: calendar.name,
            },
            masterCategories,
          ),
        ),
      );
    } catch (error) {
      if (isGraphThrottleError(error)) {
        console.warn(`Calendar throttle — skipping "${calendar.name}" for ${accountId}:`, error);
        return;
      }
      throw error;
    }
  });

  const merged: GraphCalendarItemDto[] = [];
  const seen = new Set<string>();
  for (const batch of batches) {
    for (const dto of batch) {
      const key = `${dto.connectedAccountId}:${dto.externalId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(dto);
    }
  }

  return merged;
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

export async function fetchMicrosoftMailFolders(
  accountId: string,
  options?: { includeChildFolders?: boolean },
): Promise<GraphMailFolderDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const accountKey = accountKeyFromRecord(account);
  const folders: GraphMailFolderDto[] = [];
  const includeChildFolders = options?.includeChildFolders ?? false;

  async function loadChildFolders(
    parentGraphId: string,
    parentCompositeId: string | undefined,
    depth: number,
  ): Promise<void> {
    if (!includeChildFolders || depth > 3) return;
    try {
      const response = await graphFetch(
        accountId,
        `/me/mailFolders/${encodeGraphPathSegment(parentGraphId)}/childFolders?$select=id,displayName`,
      );
      const payload = (await response.json()) as {
        value?: Array<{ id: string; displayName?: string }>;
      };
      for (const child of payload.value ?? []) {
        const compositeId = folderCompositeId(accountKey, child.id);
        folders.push({
          id: compositeId,
          graphFolderId: child.id,
          label: child.displayName ?? "Folder",
          accountId: accountKey,
          connectedAccountId: account.id,
          parentFolderId: parentCompositeId,
        });
        await loadChildFolders(child.id, compositeId, depth + 1);
      }
    } catch (error) {
      console.warn(`Failed to load child folders for ${parentGraphId}:`, error);
    }
  }

  for (const wellKnown of WELL_KNOWN_FOLDERS) {
    if (!wellKnown.path) continue;
    try {
      const response = await graphFetch(
        accountId,
        `/me/mailFolders/${wellKnown.path}?$select=id,displayName`,
      );
      const payload = (await response.json()) as { id: string; displayName?: string };
      const compositeId = folderCompositeId(accountKey, payload.id);
      folders.push({
        id: compositeId,
        graphFolderId: payload.id,
        label: payload.displayName ?? wellKnown.label,
        accountId: accountKey,
        connectedAccountId: account.id,
        wellKnown: wellKnown.path,
      });
      await loadChildFolders(payload.id, compositeId, 0);
    } catch (error) {
      console.warn(`Failed to load ${wellKnown.path} folder for ${accountId}:`, error);
    }
  }

  return folders;
}

async function resolveMicrosoftMailFolder(
  accountId: string,
  folderGraphId?: string,
): Promise<GraphMailFolderDto | null> {
  if (folderGraphId) {
    const account = await getConnectedAccountRecord(accountId);
    if (!account) throw new Error("Connected account not found");
    const accountKey = accountKeyFromRecord(account);
    return {
      id: folderCompositeId(accountKey, folderGraphId),
      graphFolderId: folderGraphId,
      label: "Folder",
      accountId: accountKey,
      connectedAccountId: account.id,
    };
  }

  const folders = await fetchMicrosoftMailFolders(accountId);
  return folders.find((entry) => entry.wellKnown === "inbox") ?? folders[0] ?? null;
}

function mapGraphMessageToDto(
  message: GraphMessage,
  account: ConnectedAccountRecord,
  folder: Pick<GraphMailFolderDto, "id" | "graphFolderId">,
): GraphEmailDto {
  const accountKey = accountKeyFromRecord(account);
  const bodyContentType =
    message.body?.contentType?.toLowerCase() === "html" ? ("html" as const) : ("text" as const);
  const rawBody = message.body?.content ?? message.bodyPreview ?? "";
  return {
    id: `graph-${message.id}`,
    accountId: accountKey,
    connectedAccountId: account.id,
    folderId: folder.id,
    from: message.from?.emailAddress?.name ?? "Unknown",
    fromEmail: message.from?.emailAddress?.address ?? "",
    subject: message.subject ?? "(No subject)",
    preview: message.bodyPreview ?? "",
    body:
      bodyContentType === "html"
        ? rawBody
        : normalizeEmailBody(rawBody, message.body?.contentType),
    bodyContentType,
    date: message.receivedDateTime ?? new Date().toISOString(),
    unread: !message.isRead,
    starred: false,
    flagged: message.flag?.flagStatus === "flagged",
    category: "Work",
    labels: ["Outlook"],
    externalId: message.id,
    provider: "microsoft",
    hasAttachments: Boolean(message.hasAttachments),
  };
}

export async function fetchMicrosoftMessages(
  accountId: string,
  top = 50,
  folderGraphId?: string,
): Promise<GraphEmailDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const folder = await resolveMicrosoftMailFolder(accountId, folderGraphId);
  if (!folder) return [];

  const folderPath = encodeGraphPathSegment(folderGraphId ?? folder.graphFolderId);
  const query = buildGraphQuery({
    $top: String(top),
    $orderby: "receivedDateTime desc",
    $select: "id,subject,bodyPreview,body,from,receivedDateTime,isRead,flag,hasAttachments",
  });

  const response = await graphFetch(
    accountId,
    `/me/mailFolders/${folderPath}/messages?${query}`,
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

export async function updateMicrosoftMailReadState(
  accountId: string,
  messageId: string,
  isRead: boolean,
): Promise<void> {
  await graphFetch(accountId, `/me/messages/${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    body: JSON.stringify({ isRead }),
  });
}

export async function moveMicrosoftMail(
  accountId: string,
  messageId: string,
  destinationFolderId: string,
): Promise<void> {
  await graphFetch(accountId, `/me/messages/${encodeURIComponent(messageId)}/move`, {
    method: "POST",
    body: JSON.stringify({ destinationId: destinationFolderId }),
  });
}

export async function forwardMicrosoftMail(
  accountId: string,
  messageId: string,
  input: { comment: string; to: string[] },
): Promise<void> {
  const toRecipients = graphRecipients(input.to);
  if (toRecipients.length === 0) throw new Error("At least one recipient is required");

  await graphFetch(accountId, `/me/messages/${encodeURIComponent(messageId)}/forward`, {
    method: "POST",
    body: JSON.stringify({
      comment: input.comment,
      toRecipients,
    }),
  });
}

export async function searchMicrosoftMessages(
  accountId: string,
  query: string,
  top = 50,
): Promise<GraphEmailDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const folders = await fetchMicrosoftMailFolders(accountId);
  const inbox =
    folders.find((entry) => entry.wellKnown === "inbox") ?? folders[0];
  if (!inbox) return [];

  const searchQuery = buildGraphQuery({
    $search: `"${query.replace(/"/g, "")}"`,
    $top: String(top),
    $select: "id,subject,bodyPreview,body,from,receivedDateTime,isRead,flag,hasAttachments",
  });

  const response = await graphFetch(accountId, `/me/messages?${searchQuery}`, {
    headers: { ConsistencyLevel: "eventual" },
  });
  const payload = (await response.json()) as { value?: GraphMessage[] };

  return (payload.value ?? []).map((message) => mapGraphMessageToDto(message, account, inbox));
}

export async function fetchMicrosoftMessageAttachments(
  accountId: string,
  messageId: string,
): Promise<GraphMailAttachmentDto[]> {
  const response = await graphFetch(
    accountId,
    `/me/messages/${encodeURIComponent(messageId)}/attachments?$select=id,name,contentType,size,isInline,contentId`,
  );
  const payload = (await response.json()) as {
    value?: Array<{
      id: string;
      name?: string;
      contentType?: string;
      size?: number;
      isInline?: boolean;
      contentId?: string;
    }>;
  };

  return (payload.value ?? []).map((entry) => ({
    id: entry.id,
    name: entry.name ?? "attachment",
    contentType: entry.contentType,
    size: entry.size,
    isInline: entry.isInline,
    contentId: entry.contentId,
  }));
}

export async function downloadMicrosoftMessageAttachment(
  accountId: string,
  messageId: string,
  attachmentId: string,
): Promise<{ name: string; contentType: string; buffer: Buffer }> {
  const metaResponse = await graphFetch(
    accountId,
    `/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );
  const meta = (await metaResponse.json()) as {
    name?: string;
    contentType?: string;
    contentBytes?: string;
  };

  if (!meta.contentBytes) {
    throw new Error("Attachment content is not available");
  }

  return {
    name: meta.name ?? "attachment",
    contentType: meta.contentType ?? "application/octet-stream",
    buffer: Buffer.from(meta.contentBytes, "base64"),
  };
}

export async function saveMicrosoftMailDraft(
  accountId: string,
  input: SendMailInput & { draftId?: string },
): Promise<{ externalId: string }> {
  const messageBody = {
    subject: input.subject,
    body: { contentType: "Text", content: input.body },
    toRecipients: graphRecipients(input.to),
    ...(input.cc?.length ? { ccRecipients: graphRecipients(input.cc) } : {}),
    ...(input.bcc?.length ? { bccRecipients: graphRecipients(input.bcc) } : {}),
  };

  if (input.draftId) {
    await graphFetch(accountId, `/me/messages/${encodeURIComponent(input.draftId)}`, {
      method: "PATCH",
      body: JSON.stringify(messageBody),
    });
    return { externalId: input.draftId };
  }

  const response = await graphFetch(accountId, "/me/messages", {
    method: "POST",
    body: JSON.stringify({ ...messageBody, isDraft: true }),
  });
  const created = (await response.json()) as { id: string };
  return { externalId: created.id };
}

interface GraphDriveItem {
  id: string;
  name: string;
  webUrl?: string;
  folder?: Record<string, unknown>;
  file?: Record<string, unknown>;
  size?: number;
}

export interface GraphDriveFileDto {
  id: string;
  name: string;
  webUrl?: string;
  accountId: string;
  connectedAccountId: string;
  parentId?: string;
  size?: number;
  isFolder: boolean;
}

export async function fetchOneDriveFolders(
  accountId: string,
  parentId?: string,
): Promise<GraphDriveItemDto[]> {
  const items = await fetchOneDriveItems(accountId, parentId);
  return items
    .filter((item) => item.isFolder)
    .map(({ isFolder: _isFolder, size: _size, ...folder }) => folder);
}

export async function fetchOneDriveItems(
  accountId: string,
  parentId?: string,
): Promise<GraphDriveFileDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const accountKey = accountKeyFromRecord(account);
  const path = parentId
    ? `/me/drive/items/${encodeURIComponent(parentId)}/children?$select=id,name,webUrl,folder,file,size`
    : `/me/drive/root/children?$select=id,name,webUrl,folder,file,size`;

  const response = await graphFetch(accountId, path);
  const payload = (await response.json()) as { value?: GraphDriveItem[] };

  return (payload.value ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    webUrl: item.webUrl,
    accountId: accountKey,
    connectedAccountId: account.id,
    parentId,
    size: item.size,
    isFolder: Boolean(item.folder),
  }));
}

export async function uploadOneDriveFile(
  accountId: string,
  parentId: string,
  fileName: string,
  content: Buffer,
  contentType = "application/octet-stream",
): Promise<{ id: string; name: string; webUrl?: string }> {
  const token = await getValidAccessToken(accountId);
  const response = await fetch(
    `${MICROSOFT_GRAPH_BASE}/me/drive/items/${encodeURIComponent(parentId)}:/${encodeURIComponent(fileName)}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body: content,
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OneDrive upload failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as { id: string; name: string; webUrl?: string };
}

export async function deleteOneDriveItem(accountId: string, itemId: string): Promise<void> {
  await graphFetch(accountId, `/me/drive/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
}

export async function sendMicrosoftMailWithDriveAttachments(
  accountId: string,
  input: SendMailInput & { driveAttachmentIds?: string[] },
): Promise<void> {
  const toRecipients = graphRecipients(input.to);
  if (toRecipients.length === 0) throw new Error("At least one recipient is required");

  const attachments: Array<Record<string, unknown>> = [];
  for (const itemId of input.driveAttachmentIds ?? []) {
    const metaResponse = await graphFetch(
      accountId,
      `/me/drive/items/${encodeURIComponent(itemId)}?$select=id,name,webUrl`,
    );
    const meta = (await metaResponse.json()) as { name?: string; webUrl?: string };
    attachments.push({
      "@odata.type": "#microsoft.graph.referenceAttachment",
      name: meta.name ?? "file",
      sourceUrl: meta.webUrl,
      providerType: "oneDrivePro",
    });
  }

  await graphFetch(accountId, "/me/sendMail", {
    method: "POST",
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: { contentType: "Text", content: input.body },
        toRecipients,
        ...(input.cc?.length ? { ccRecipients: graphRecipients(input.cc) } : {}),
        ...(input.bcc?.length ? { bccRecipients: graphRecipients(input.bcc) } : {}),
        ...(attachments.length > 0 ? { attachments } : {}),
      },
      saveToSentItems: true,
    }),
  });
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

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function oneNotePageHtml(title: string, body: string): string {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br/>");
  return `<!DOCTYPE html><html><head><title>${safeTitle}</title></head><body><p>${safeBody}</p></body></html>`;
}

async function getDefaultOneNoteSectionId(accountId: string): Promise<string> {
  const notebooksResponse = await graphFetch(accountId, "/me/onenote/notebooks");
  const notebooksPayload = (await notebooksResponse.json()) as {
    value?: Array<{ id: string }>;
  };
  const notebookId = notebooksPayload.value?.[0]?.id;
  if (!notebookId) throw new Error("No OneNote notebook found");

  const sectionsResponse = await graphFetch(
    accountId,
    `/me/onenote/notebooks/${encodeURIComponent(notebookId)}/sections`,
  );
  const sectionsPayload = (await sectionsResponse.json()) as {
    value?: Array<{ id: string }>;
  };
  const sectionId = sectionsPayload.value?.[0]?.id;
  if (!sectionId) throw new Error("No OneNote section found");
  return sectionId;
}

interface OneNotePage {
  id: string;
  title?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

async function fetchOneNotePageBody(accountId: string, pageId: string): Promise<string> {
  try {
    const token = await getValidAccessToken(accountId);
    const response = await fetch(
      `${MICROSOFT_GRAPH_BASE}/me/onenote/pages/${encodeURIComponent(pageId)}/content`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return "";
    const html = await response.text();
    return stripHtml(html);
  } catch {
    return "";
  }
}

function mapOneNotePageToDto(
  page: OneNotePage,
  body: string,
  account: ConnectedAccountRecord,
): GraphNoteDto {
  const accountKey = `ms-${account.id}`;
  const title = page.title?.trim() || body.split("\n")[0]?.slice(0, 80) || "(Untitled note)";
  return {
    id: `graph-note-${page.id}`,
    title,
    body,
    preview: body.split("\n")[0]?.slice(0, 120) ?? title,
    createdAt: page.createdDateTime ?? new Date().toISOString(),
    updatedAt: page.lastModifiedDateTime ?? page.createdDateTime ?? new Date().toISOString(),
    categories: ["OneNote"],
    colour: OUTLOOK_NOTE_COLOUR,
    accountId: accountKey,
    externalId: page.id,
    provider: "microsoft",
    connectedAccountId: account.id,
  };
}

export async function fetchMicrosoftNotes(
  accountId: string,
  top = 25,
  options?: { includeContent?: boolean },
): Promise<GraphNoteDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");
  const includeContent = options?.includeContent ?? false;

  try {
    const notebooksResponse = await graphFetch(accountId, "/me/onenote/notebooks?$top=3");
    const notebooksPayload = (await notebooksResponse.json()) as {
      value?: Array<{ id: string }>;
    };

    const pages: OneNotePage[] = [];
    for (const notebook of notebooksPayload.value ?? []) {
      if (pages.length >= top) break;
      const sectionsResponse = await graphFetch(
        accountId,
        `/me/onenote/notebooks/${encodeURIComponent(notebook.id)}/sections`,
      );
      const sectionsPayload = (await sectionsResponse.json()) as {
        value?: Array<{ id: string }>;
      };
      for (const section of sectionsPayload.value ?? []) {
        if (pages.length >= top) break;
        const pagesResponse = await graphFetch(
          accountId,
          `/me/onenote/sections/${encodeURIComponent(section.id)}/pages?$top=${Math.min(top - pages.length, 25)}&$orderby=lastModifiedDateTime desc`,
        );
        const pagesPayload = (await pagesResponse.json()) as { value?: OneNotePage[] };
        pages.push(...(pagesPayload.value ?? []));
      }
    }

    const limited = pages.slice(0, top);
    if (!includeContent) {
      return limited.map((page) => mapOneNotePageToDto(page, page.title ?? "", account));
    }

    const notes: GraphNoteDto[] = [];
    await runWithConcurrency(limited, 2, async (page) => {
      const body = await fetchOneNotePageBody(accountId, page.id);
      notes.push(mapOneNotePageToDto(page, body, account));
    });

    return notes.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  } catch (error) {
    console.warn(`OneNote fetch failed for ${accountId}:`, error);
    return [];
  }
}

export async function createMicrosoftNote(
  accountId: string,
  input: { title: string; body: string },
): Promise<{ externalId: string }> {
  const sectionId = await getDefaultOneNoteSectionId(accountId);
  const token = await getValidAccessToken(accountId);
  const response = await fetch(
    `${MICROSOFT_GRAPH_BASE}/me/onenote/sections/${encodeURIComponent(sectionId)}/pages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/xhtml+xml",
      },
      body: oneNotePageHtml(input.title, input.body),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OneNote create failed (${response.status}): ${detail}`);
  }

  const page = (await response.json()) as { id: string };
  return { externalId: page.id };
}

export async function updateMicrosoftNote(
  accountId: string,
  externalId: string,
  input: { title: string; body: string },
): Promise<void> {
  const token = await getValidAccessToken(accountId);
  const response = await fetch(
    `${MICROSOFT_GRAPH_BASE}/me/onenote/pages/${encodeURIComponent(externalId)}/content`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          target: "body",
          action: "replace",
          content: oneNotePageHtml(input.title, input.body),
        },
      ]),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OneNote update failed (${response.status}): ${detail}`);
  }
}

export async function deleteMicrosoftNote(
  accountId: string,
  externalId: string,
): Promise<void> {
  await graphFetch(accountId, `/me/onenote/pages/${encodeURIComponent(externalId)}`, {
    method: "DELETE",
  });
}

function hasExplicitScheduleTime(input: {
  startTime?: string;
  endTime?: string;
}): boolean {
  return Boolean(input.startTime?.trim() || input.endTime?.trim());
}

function buildEventPayload(input: CalendarSyncInput): Record<string, unknown> {
  const timeZone =
    input.timeZone ?? process.env.MICROSOFT_CALENDAR_TIMEZONE ?? "Europe/London";
  const allDay = input.allDay || !hasExplicitScheduleTime(input);

  let payload: Record<string, unknown>;

  if (allDay) {
    const end =
      input.endDate && input.endDate > input.date
        ? input.endDate
        : addDaysIso(input.date, 1);
    payload = {
      subject: input.title,
      body: { contentType: "text", content: input.notes ?? "" },
      start: { dateTime: `${input.date}T00:00:00`, timeZone },
      end: { dateTime: `${end}T00:00:00`, timeZone },
      isAllDay: true,
    };
  } else {
    const startTime = input.startTime!;
    const endTime = input.endTime ?? input.startTime ?? startTime;
    payload = {
      subject: input.title,
      body: { contentType: "text", content: input.notes ?? "" },
      start: { dateTime: `${input.date}T${startTime}:00`, timeZone },
      end: { dateTime: `${input.date}T${endTime}:00`, timeZone },
      isAllDay: false,
    };
  }

  if (input.attendees?.length) {
    payload.attendees = input.attendees.map((address) => ({
      emailAddress: { address: address.trim() },
      type: "required",
    }));
  }

  if (input.recurrence) {
    const recurrence = buildMicrosoftGraphRecurrence(input.date, input.recurrence);
    if (recurrence) payload.recurrence = recurrence;
  } else if (input.recurringWeekly) {
    const dayName = new Date(`${input.date}T12:00:00`)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    payload.recurrence = {
      pattern: { type: "weekly", interval: 1, daysOfWeek: [dayName] },
      range: {
        type: "numbered",
        startDate: input.date,
        numberOfOccurrences: 10,
      },
    };
  }

  if (input.teamsMeeting) {
    payload.isOnlineMeeting = true;
    payload.onlineMeetingProvider = "teamsForBusiness";
  }

  if (input.categories !== undefined) {
    payload.categories = input.categories;
  }

  const minutes = getReminderMinutesBefore(input);
  if (minutes != null) {
    payload.isReminderOn = true;
    payload.reminderMinutesBeforeStart = minutes;
  } else {
    payload.isReminderOn = false;
  }

  return payload;
}

function addDaysIso(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

async function removeExistingPhotoAttachments(
  accountId: string,
  eventId: string,
  filename: string,
): Promise<void> {
  try {
    const response = await graphFetch(
      accountId,
      `/me/events/${encodeURIComponent(eventId)}/attachments?$select=id,name`,
    );
    const payload = (await response.json()) as { value?: Array<{ id: string; name?: string }> };
    const matches = (payload.value ?? []).filter((entry) => entry.name === filename);
    await Promise.all(
      matches.map((entry) =>
        graphFetch(
          accountId,
          `/me/events/${encodeURIComponent(eventId)}/attachments/${encodeURIComponent(entry.id)}`,
          { method: "DELETE" },
        ),
      ),
    );
  } catch (error) {
    console.warn(`Failed to replace photo attachments on event ${eventId}:`, error);
  }
}

async function attachPhotoToEvent(
  accountId: string,
  eventId: string,
  input: CalendarSyncInput,
): Promise<boolean> {
  if (!input.photoStorageKey || !input.photoMimeType) return false;

  const file = await readAttachmentBuffer(input.photoStorageKey);
  if (!file) {
    throw new Error("Photo file could not be read for Outlook sync");
  }

  const filename = input.photoFilename ?? "photo.jpg";
  await removeExistingPhotoAttachments(accountId, eventId, filename);

  await graphFetch(accountId, `/me/events/${encodeURIComponent(eventId)}/attachments`, {
    method: "POST",
    body: JSON.stringify({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: filename,
      contentType: input.photoMimeType || file.mimeType,
      contentBytes: file.buffer.toString("base64"),
    }),
  });

  return true;
}

const MYAXIS_CALENDAR_EXTENSION = "com.myaxis.calendarItem";

async function syncMyAxisCalendarExtension(
  accountId: string,
  eventId: string,
  localItemId: string,
): Promise<void> {
  const body = {
    "@odata.type": "microsoft.graph.openTypeExtension",
    extensionName: MYAXIS_CALENDAR_EXTENSION,
    myaxisLocalItemId: localItemId,
  };

  try {
    await graphFetch(accountId, `/me/events/${encodeURIComponent(eventId)}/extensions`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("409") && !message.includes("400")) {
      console.warn("MyAxis calendar extension POST failed:", error);
      return;
    }
    try {
      await graphFetch(
        accountId,
        `/me/events/${encodeURIComponent(eventId)}/extensions/${MYAXIS_CALENDAR_EXTENSION}`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
    } catch (patchError) {
      console.warn("MyAxis calendar extension PATCH failed:", patchError);
    }
  }
}

async function resolveCalendarEventPath(
  accountId: string,
  externalId: string,
  calendarId?: string,
): Promise<string> {
  if (calendarId) {
    return `/me/calendars/${encodeGraphPathSegment(calendarId)}/events/${encodeURIComponent(externalId)}`;
  }
  return `/me/events/${encodeURIComponent(externalId)}`;
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
    ? `/me/calendars/${encodeGraphPathSegment(targetCalendar.graphCalendarId)}`
    : "/me/calendar";

  const existingExternalId =
    mapping?.connectedAccountId === accountId
      ? mapping.externalId
      : input.externalId;

  if (existingExternalId) {
    const eventPath = await resolveCalendarEventPath(
      accountId,
      existingExternalId,
      input.calendarId ?? targetCalendar?.graphCalendarId,
    );
    const response = await graphFetch(accountId, eventPath, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const event = (await response.json()) as { id: string; webLink?: string };
    if (!mapping || mapping.externalId !== event.id) {
      await upsertProviderMapping({
        connectedAccountId: accountId,
        itemType: "calendar",
        localItemId: input.localItemId,
        externalId: event.id,
      });
    }
    let photoAttached = false;
    if (input.photoStorageKey) {
      photoAttached = await attachPhotoToEvent(accountId, event.id, input);
    }
    await syncMyAxisCalendarExtension(accountId, event.id, input.localItemId);
    return { externalId: event.id, webLink: event.webLink, photoAttached };
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

  let photoAttached = false;
  if (input.photoStorageKey) {
    photoAttached = await attachPhotoToEvent(accountId, event.id, input);
  }
  await syncMyAxisCalendarExtension(accountId, event.id, input.localItemId);
  return { externalId: event.id, webLink: event.webLink, photoAttached };
}

export async function deleteMicrosoftCalendarEvent(
  accountId: string,
  externalId: string,
  calendarId?: string,
): Promise<void> {
  const eventPath = await resolveCalendarEventPath(accountId, externalId, calendarId);
  await graphFetch(accountId, eventPath, { method: "DELETE" });
}

export async function respondToMicrosoftCalendarEvent(
  accountId: string,
  externalId: string,
  response: "accept" | "decline" | "tentativelyAccept",
  comment?: string,
): Promise<void> {
  await graphFetch(accountId, `/me/events/${encodeURIComponent(externalId)}/${response}`, {
    method: "POST",
    body: JSON.stringify(comment ? { comment } : {}),
  });
}

export interface ScheduleAvailabilitySlot {
  email: string;
  availabilityView: string;
  workingHours?: Record<string, unknown>;
}

export async function getMicrosoftSchedule(
  accountId: string,
  input: {
    emails: string[];
    start: string;
    end: string;
  },
): Promise<ScheduleAvailabilitySlot[]> {
  const timeZone = process.env.MICROSOFT_CALENDAR_TIMEZONE ?? "Europe/London";
  const response = await graphFetch(accountId, "/me/calendar/getSchedule", {
    method: "POST",
    body: JSON.stringify({
      schedules: input.emails,
      startTime: { dateTime: input.start, timeZone },
      endTime: { dateTime: input.end, timeZone },
      availabilityViewInterval: 30,
    }),
  });
  const payload = (await response.json()) as {
    value?: Array<{ scheduleId?: string; availabilityView?: string; workingHours?: Record<string, unknown> }>;
  };
  return (payload.value ?? []).map((entry) => ({
    email: entry.scheduleId ?? "",
    availabilityView: entry.availabilityView ?? "",
    workingHours: entry.workingHours,
  }));
}

export async function fetchMicrosoftTodoLists(accountId: string): Promise<GraphTodoListDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  // Personal Microsoft accounts reject $select on /me/todo/lists (RequestBroker--ParseUri).
  const response = await graphFetch(accountId, "/me/todo/lists");
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

function buildTodoTaskBody(input: {
  title: string;
  dueDate?: string;
  notes?: string;
  completed?: boolean;
  startTime?: string;
  allDay?: boolean;
  reminderPreset?: string;
  reminderCustomMinutes?: number;
  reminderAt?: string;
}): Record<string, unknown> {
  const timeZone = process.env.MICROSOFT_CALENDAR_TIMEZONE ?? "Europe/London";
  const body: Record<string, unknown> = {
    title: input.title,
    body: {
      content: input.notes ?? "",
      contentType: "text",
    },
  };

  if (input.dueDate) {
    const dueTime = input.startTime && !input.allDay ? input.startTime : "09:00";
    body.dueDateTime = {
      dateTime: `${input.dueDate}T${dueTime}:00`,
      timeZone,
    };
  }

  if (input.completed !== undefined) {
    body.status = input.completed ? "completed" : "notStarted";
  }

  const reminderDateTime = getReminderDateTimeForSync(
    {
      date: input.dueDate ?? new Date().toISOString().slice(0, 10),
      startTime: input.startTime,
      allDay: input.allDay ?? true,
      reminderPreset: input.reminderPreset as never,
      reminderCustomMinutes: input.reminderCustomMinutes,
      reminderAt: input.reminderAt,
    },
    timeZone,
  );
  if (reminderDateTime) {
    body.isReminderOn = true;
    body.reminderDateTime = reminderDateTime;
  } else {
    body.isReminderOn = false;
  }

  return body;
}

async function resolveTodoList(
  accountId: string,
  todoListId?: string,
): Promise<GraphTodoListDto> {
  const lists = await fetchMicrosoftTodoLists(accountId);
  const targetList =
    lists.find((list) => list.graphListId === todoListId) ??
    lists.find((list) => list.isDefault) ??
    lists[0];
  if (!targetList) throw new Error("No Microsoft To Do list found");
  return targetList;
}

export async function createMicrosoftTodoTask(
  accountId: string,
  input: { title: string; dueDate?: string; notes?: string; todoListId?: string },
): Promise<{ externalId: string; todoListId: string }> {
  const targetList = await resolveTodoList(accountId, input.todoListId);
  const response = await graphFetch(
    accountId,
    `/me/todo/lists/${encodeGraphPathSegment(targetList.graphListId)}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(buildTodoTaskBody(input)),
    },
  );
  const task = (await response.json()) as { id: string };
  return { externalId: task.id, todoListId: targetList.graphListId };
}

export async function syncMicrosoftTodoTask(
  accountId: string,
  input: TodoSyncInput,
): Promise<{ externalId: string; todoListId: string }> {
  const mapping = await getProviderMapping("task", input.localItemId);
  const targetList = await resolveTodoList(accountId, input.todoListId);
  const existingExternalId =
    mapping?.connectedAccountId === accountId ? mapping.externalId : input.externalId;
  const body = buildTodoTaskBody(input);

  if (existingExternalId) {
    const listId = input.todoListId ?? targetList.graphListId;
    const response = await graphFetch(
      accountId,
      `/me/todo/lists/${encodeGraphPathSegment(listId)}/tasks/${encodeURIComponent(existingExternalId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    const task = (await response.json()) as { id: string };
    if (!mapping || mapping.externalId !== task.id) {
      await upsertProviderMapping({
        connectedAccountId: accountId,
        itemType: "task",
        localItemId: input.localItemId,
        externalId: task.id,
      });
    }
    return { externalId: task.id, todoListId: listId };
  }

  const created = await createMicrosoftTodoTask(accountId, {
    title: input.title,
    dueDate: input.dueDate,
    notes: input.notes,
    todoListId: input.todoListId,
  });
  await upsertProviderMapping({
    connectedAccountId: accountId,
    itemType: "task",
    localItemId: input.localItemId,
    externalId: created.externalId,
  });
  return created;
}

export async function deleteMicrosoftTodoTask(
  accountId: string,
  externalId: string,
  todoListId: string,
): Promise<void> {
  await graphFetch(
    accountId,
    `/me/todo/lists/${encodeGraphPathSegment(todoListId)}/tasks/${encodeURIComponent(externalId)}`,
    { method: "DELETE" },
  );
}

export async function completeMicrosoftTodoTask(
  accountId: string,
  externalId: string,
  todoListId: string,
  completed: boolean,
): Promise<void> {
  await graphFetch(
    accountId,
    `/me/todo/lists/${encodeGraphPathSegment(todoListId)}/tasks/${encodeURIComponent(externalId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: completed ? "completed" : "notStarted" }),
    },
  );
}

interface GraphTodoTask {
  id: string;
  title?: string;
  status?: string;
  body?: { content?: string };
  dueDateTime?: { dateTime?: string; timeZone?: string };
}

export async function fetchMicrosoftTodoTasks(
  accountId: string,
  lists?: GraphTodoListDto[],
): Promise<GraphCalendarItemDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  const todoLists = lists ?? (await fetchMicrosoftTodoLists(accountId));
  const batches: GraphCalendarItemDto[][] = [];
  const today = new Date().toISOString().slice(0, 10);

  await runWithConcurrency(todoLists, GRAPH_MAX_CONCURRENT_PER_ACCOUNT, async (list) => {
    try {
      const response = await graphFetch(
        accountId,
        `/me/todo/lists/${encodeGraphPathSegment(list.graphListId)}/tasks`,
      );
      const payload = (await response.json()) as { value?: GraphTodoTask[] };
      batches.push(
        (payload.value ?? []).map((task) => {
          const dueDate = task.dueDateTime?.dateTime?.slice(0, 10) ?? today;
          return {
            id: `graph-todo-${task.id}`,
            title: task.title?.trim() || "(No title)",
            date: dueDate,
            allDay: true,
            categoryId: "task",
            colour: "#4A5A9C",
            notes: task.body?.content?.trim() || undefined,
            accountId: list.accountId,
            externalId: task.id,
            provider: "microsoft" as const,
            connectedAccountId: account.id,
            completed: task.status === "completed",
            todoListId: list.graphListId,
          };
        }),
      );
    } catch (error) {
      if (isGraphThrottleError(error)) {
        console.warn(`Todo tasks throttle — skipping "${list.name}" for ${accountId}:`, error);
        return;
      }
      throw error;
    }
  });

  const merged: GraphCalendarItemDto[] = [];
  const seen = new Set<string>();
  for (const batch of batches) {
    for (const dto of batch) {
      const key = `${dto.connectedAccountId}:${dto.externalId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(dto);
    }
  }

  return merged;
}

export async function fetchMicrosoftTodoListsAndTasks(
  accountId: string,
): Promise<{ lists: GraphTodoListDto[]; tasks: GraphCalendarItemDto[] }> {
  const lists = await fetchMicrosoftTodoLists(accountId);
  const tasks = await fetchMicrosoftTodoTasks(accountId, lists);
  return { lists, tasks };
}

interface GraphContact {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  companyName?: string;
  jobTitle?: string;
  department?: string;
  emailAddresses?: Array<{ address?: string; name?: string }>;
  businessPhones?: string[];
  homePhones?: string[];
  mobilePhone?: string;
  businessHomePage?: string;
  homeAddress?: { street?: string; city?: string; state?: string; postalCode?: string; countryOrRegion?: string };
  birthday?: string;
  personalNotes?: string;
}

export async function fetchMicrosoftContacts(accountId: string, top = 250): Promise<GraphContactDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");

  // Personal Microsoft accounts reject $select on some endpoints — fetch full contacts.
  const query = buildGraphQuery({
    $top: String(top),
    $orderby: "displayName",
  });

  let response: Response;
  try {
    response = await graphFetch(accountId, `/me/contacts?${query}`);
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
    const addressParts = contact.homeAddress
      ? [
          contact.homeAddress.street,
          contact.homeAddress.city,
          contact.homeAddress.state,
          contact.homeAddress.postalCode,
          contact.homeAddress.countryOrRegion,
        ].filter(Boolean)
      : [];
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
      emailSecondary: contact.emailAddresses?.[1]?.address,
      homePhone: contact.homePhones?.[0],
      department: contact.department,
      website: contact.businessHomePage,
      address: addressParts.length > 0 ? addressParts.join("\n") : undefined,
      birthday: contact.birthday?.slice(0, 10),
      notes: contact.personalNotes,
    };
  });
}

export interface ContactSyncInput {
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
}

function buildContactPayload(input: ContactSyncInput): Record<string, unknown> {
  const nameParts = input.name.trim().split(/\s+/);
  const emailAddresses = [
    input.email ? { address: input.email, name: input.name } : null,
    input.emailSecondary ? { address: input.emailSecondary } : null,
  ].filter(Boolean);

  return {
    givenName: nameParts[0],
    surname: nameParts.slice(1).join(" ") || undefined,
    displayName: input.name,
    companyName: input.company || undefined,
    jobTitle: input.jobTitle || undefined,
    department: input.department || undefined,
    businessPhones: input.phone ? [input.phone] : undefined,
    homePhones: input.homePhone ? [input.homePhone] : undefined,
    mobilePhone: input.mobilePhone || undefined,
    businessHomePage: input.website || undefined,
    personalNotes: input.notes || undefined,
    birthday: input.birthday || undefined,
    emailAddresses: emailAddresses.length > 0 ? emailAddresses : undefined,
    homeAddress: input.address ? { street: input.address } : undefined,
  };
}

export async function createMicrosoftContact(
  accountId: string,
  input: ContactSyncInput,
): Promise<{ externalId: string }> {
  const response = await graphFetch(accountId, "/me/contacts", {
    method: "POST",
    body: JSON.stringify(buildContactPayload(input)),
  });
  const created = (await response.json()) as { id: string };
  return { externalId: created.id };
}

export async function updateMicrosoftContact(
  accountId: string,
  externalId: string,
  input: ContactSyncInput,
): Promise<void> {
  await graphFetch(accountId, `/me/contacts/${encodeURIComponent(externalId)}`, {
    method: "PATCH",
    body: JSON.stringify(buildContactPayload(input)),
  });
}

export async function deleteMicrosoftContact(
  accountId: string,
  externalId: string,
): Promise<void> {
  await graphFetch(accountId, `/me/contacts/${encodeURIComponent(externalId)}`, {
    method: "DELETE",
  });
}

export async function fetchOutlookMasterCategories(
  accountId: string,
): Promise<OutlookCategoryDto[]> {
  const response = await graphFetch(accountId, "/me/outlook/masterCategories");
  const payload = (await response.json()) as {
    value?: Array<{ id: string; displayName?: string; color?: string }>;
  };
  return (payload.value ?? []).map((entry) => ({
    id: entry.id,
    displayName: entry.displayName ?? "Category",
    color: entry.color,
  }));
}

export async function createOutlookMasterCategory(
  accountId: string,
  input: { displayName: string; color: string },
): Promise<OutlookCategoryDto> {
  const response = await graphFetch(accountId, "/me/outlook/masterCategories", {
    method: "POST",
    body: JSON.stringify({ displayName: input.displayName, color: input.color }),
  });
  const entry = (await response.json()) as {
    id: string;
    displayName?: string;
    color?: string;
  };
  return {
    id: entry.id,
    displayName: entry.displayName ?? input.displayName,
    color: entry.color ?? input.color,
  };
}

export async function updateOutlookMasterCategory(
  accountId: string,
  categoryId: string,
  input: { color: string },
): Promise<OutlookCategoryDto> {
  const response = await graphFetch(
    accountId,
    `/me/outlook/masterCategories/${encodeURIComponent(categoryId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ color: input.color }),
    },
  );
  const entry = (await response.json()) as {
    id: string;
    displayName?: string;
    color?: string;
  };
  return {
    id: entry.id,
    displayName: entry.displayName ?? "Category",
    color: entry.color ?? input.color,
  };
}

export async function deleteOutlookMasterCategory(
  accountId: string,
  categoryId: string,
): Promise<void> {
  await graphFetch(accountId, `/me/outlook/masterCategories/${encodeURIComponent(categoryId)}`, {
    method: "DELETE",
  });
}

export async function updateMicrosoftMailCategories(
  accountId: string,
  messageId: string,
  categories: string[],
): Promise<void> {
  await graphFetch(accountId, `/me/messages/${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    body: JSON.stringify({ categories }),
  });
}

export interface MailRuleDto {
  id: string;
  displayName: string;
  isEnabled: boolean;
  sequence: number;
}

export async function fetchMicrosoftMailRules(accountId: string): Promise<MailRuleDto[]> {
  const response = await graphFetch(accountId, "/me/mailFolders/inbox/messageRules");
  const payload = (await response.json()) as {
    value?: Array<{ id: string; displayName?: string; isEnabled?: boolean; sequence?: number }>;
  };
  return (payload.value ?? []).map((rule) => ({
    id: rule.id,
    displayName: rule.displayName ?? "Rule",
    isEnabled: rule.isEnabled ?? true,
    sequence: rule.sequence ?? 0,
  }));
}

export interface AutomaticRepliesSettings {
  status: "disabled" | "alwaysEnabled" | "scheduled";
  externalReplyMessage?: string;
  internalReplyMessage?: string;
  scheduledStartDateTime?: string;
  scheduledEndDateTime?: string;
}

export async function getAutomaticRepliesSettings(
  accountId: string,
): Promise<AutomaticRepliesSettings> {
  const response = await graphFetch(
    accountId,
    "/me/mailboxSettings/automaticRepliesSetting",
  );
  const payload = (await response.json()) as AutomaticRepliesSettings;
  return payload;
}

export async function setAutomaticRepliesSettings(
  accountId: string,
  settings: AutomaticRepliesSettings,
): Promise<void> {
  await graphFetch(accountId, "/me/mailboxSettings", {
    method: "PATCH",
    body: JSON.stringify({ automaticRepliesSetting: settings }),
  });
}

export async function fetchSharedMailboxFolders(
  accountId: string,
  sharedMailboxEmail: string,
): Promise<GraphMailFolderDto[]> {
  const account = await getConnectedAccountRecord(accountId);
  if (!account) throw new Error("Connected account not found");
  const accountKey = accountKeyFromRecord(account);

  const response = await graphFetch(
    accountId,
    `/users/${encodeURIComponent(sharedMailboxEmail)}/mailFolders?$select=id,displayName`,
  );
  const payload = (await response.json()) as {
    value?: Array<{ id: string; displayName?: string }>;
  };

  return (payload.value ?? []).map((folder) => ({
    id: folderCompositeId(accountKey, folder.id),
    graphFolderId: folder.id,
    label: `${sharedMailboxEmail}: ${folder.displayName ?? "Folder"}`,
    accountId: accountKey,
    connectedAccountId: account.id,
  }));
}

export interface TeamsChatDto {
  id: string;
  topic?: string;
  webUrl?: string;
}

export async function fetchMicrosoftTeamsChats(
  accountId: string,
  top = 20,
): Promise<TeamsChatDto[]> {
  const response = await graphFetch(accountId, `/me/chats?$top=${top}&$expand=lastMessagePreview`);
  const payload = (await response.json()) as {
    value?: Array<{ id: string; topic?: string; webUrl?: string }>;
  };
  return (payload.value ?? []).map((chat) => ({
    id: chat.id,
    topic: chat.topic ?? "Chat",
    webUrl: chat.webUrl,
  }));
}

export async function createMicrosoftTeamsMeeting(
  accountId: string,
  input: { subject: string; start: string; end: string },
): Promise<{ joinUrl: string; meetingId: string }> {
  const response = await graphFetch(accountId, "/me/onlineMeetings", {
    method: "POST",
    body: JSON.stringify({
      subject: input.subject,
      startDateTime: input.start,
      endDateTime: input.end,
      participants: { attendees: [] },
    }),
  });
  const meeting = (await response.json()) as { id: string; joinWebUrl?: string };
  if (!meeting.joinWebUrl) throw new Error("Teams meeting created without join URL");
  return { joinUrl: meeting.joinWebUrl, meetingId: meeting.id };
}
