import type { AppleCalendarItemDto } from "../../shared/appleApi";
import type { ConnectedAccountRecord } from "./connected-account-service";
import { getAppleAccountKey } from "./apple-account-service";

interface ParsedIcsEvent {
  uid: string;
  summary: string;
  description?: string;
  start: { date: string; time?: string; allDay: boolean };
  end?: { date: string; time?: string; allDay: boolean };
}

function unfoldIcs(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function parseIcsDateValue(value: string): { date: string; time?: string; allDay: boolean } {
  const trimmed = value.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return {
      date: `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`,
      allDay: true,
    };
  }

  const match = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) {
    return { date: new Date().toISOString().slice(0, 10), allDay: true };
  }

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
    allDay: false,
  };
}

function parseIcsProperty(line: string): { name: string; value: string } {
  const colonIndex = line.indexOf(":");
  if (colonIndex < 0) return { name: line, value: "" };
  const rawName = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1);
  const name = rawName.split(";")[0]?.toUpperCase() ?? rawName;
  return { name, value };
}

function parseIcsEvents(content: string): ParsedIcsEvent[] {
  const unfolded = unfoldIcs(content);
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);
  const events: ParsedIcsEvent[] = [];

  for (const block of blocks) {
    const chunk = block.split("END:VEVENT")[0] ?? "";
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);

    let uid = "";
    let summary = "(No title)";
    let description: string | undefined;
    let start: ParsedIcsEvent["start"] | undefined;
    let end: ParsedIcsEvent["end"] | undefined;

    for (const line of lines) {
      const { name, value } = parseIcsProperty(line);
      if (name === "UID") uid = value;
      if (name === "SUMMARY") summary = value.replace(/\\n/g, "\n").replace(/\\,/g, ",");
      if (name === "DESCRIPTION") {
        description = value.replace(/\\n/g, "\n").replace(/\\,/g, ",");
      }
      if (name === "DTSTART") start = parseIcsDateValue(value);
      if (name === "DTEND") end = parseIcsDateValue(value);
    }

    if (!start) continue;
    events.push({
      uid: uid || `${summary}-${start.date}-${start.time ?? "allday"}`,
      summary,
      description,
      start,
      end,
    });
  }

  return events;
}

function subtractOneDayIso(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - 1);
  return value.toISOString().slice(0, 10);
}

function normalizeSubscribeUrl(url: string): string {
  return url.trim().replace(/^webcal:\/\//i, "https://");
}

function isAllowedSubscribeUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeSubscribeUrl(url));
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export async function fetchIcsCalendarEvents(
  subscribeUrl: string,
  account: ConnectedAccountRecord,
): Promise<AppleCalendarItemDto[]> {
  if (!isAllowedSubscribeUrl(subscribeUrl)) {
    throw new Error("Invalid calendar subscribe URL");
  }

  const response = await fetch(normalizeSubscribeUrl(subscribeUrl), {
    headers: { Accept: "text/calendar, text/plain, */*" },
  });

  if (!response.ok) {
    throw new Error(`Calendar subscribe fetch failed (${response.status})`);
  }

  const content = await response.text();
  const accountKey = getAppleAccountKey(account);
  const parsedEvents = parseIcsEvents(content);

  return parsedEvents.map((event) => {
    const allDay = event.start.allDay;
    let endDate: string | undefined;

    if (allDay && event.end && event.end.date > event.start.date) {
      endDate = subtractOneDayIso(event.end.date);
    } else if (!allDay && event.end && event.end.date > event.start.date) {
      endDate = event.end.date;
    }

    return {
      id: `applecal-${event.uid}`,
      title: event.summary,
      date: event.start.date,
      endDate,
      startTime: allDay ? undefined : event.start.time,
      endTime: allDay ? undefined : event.end?.time,
      allDay,
      categoryId: "family",
      colour: "#555555",
      notes: event.description,
      accountId: accountKey,
      externalId: event.uid,
      provider: "apple",
      connectedAccountId: account.id,
    };
  });
}
