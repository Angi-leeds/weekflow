import type { ItemRecurrence } from "./itemRecurrence";

/** Build Microsoft Graph recurrence object from item recurrence + start date. */
export function buildMicrosoftGraphRecurrence(
  date: string,
  recurrence: ItemRecurrence,
): Record<string, unknown> | undefined {
  const startParts = date.split("-").map(Number);
  const month = startParts[1];
  const dayOfMonth = startParts[2];

  switch (recurrence.kind) {
    case "yearly":
      return {
        pattern: { type: "absoluteYearly", month, dayOfMonth },
        range: { type: "noEnd", startDate: date },
      };
    case "monthly":
      return {
        pattern: { type: "absoluteMonthly", dayOfMonth, interval: 1 },
        range: { type: "noEnd", startDate: date },
      };
    case "monthlyLastDay":
      return {
        pattern: { type: "relativeMonthly", interval: 1, index: "last" },
        range: { type: "noEnd", startDate: date },
      };
    case "intervalDays": {
      const interval = Math.max(1, recurrence.intervalDays ?? 30);
      return {
        pattern: { type: "daily", interval },
        range: { type: "noEnd", startDate: date },
      };
    }
    case "weekly": {
      const dayName = new Date(`${date}T12:00:00`)
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const interval = Math.max(1, recurrence.interval ?? 1);
      const count = recurrence.count ?? 10;
      return {
        pattern: { type: "weekly", interval, daysOfWeek: [dayName] },
        range: {
          type: recurrence.until ? "endDate" : count ? "numbered" : "noEnd",
          startDate: date,
          ...(recurrence.until ? { endDate: recurrence.until } : {}),
          ...(count && !recurrence.until ? { numberOfOccurrences: count } : {}),
        },
      };
    }
    default:
      return undefined;
  }
}

/** Build Google Calendar RRULE string from item recurrence. */
export function buildGoogleRecurrenceRule(
  date: string,
  recurrence: ItemRecurrence,
): string | undefined {
  switch (recurrence.kind) {
    case "yearly":
      return "RRULE:FREQ=YEARLY";
    case "monthly": {
      const day = Number(date.split("-")[2]);
      return `RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`;
    }
    case "monthlyLastDay":
      return "RRULE:FREQ=MONTHLY;BYMONTHDAY=-1";
    case "intervalDays": {
      const interval = Math.max(1, recurrence.intervalDays ?? 30);
      return `RRULE:FREQ=DAILY;INTERVAL=${interval}`;
    }
    case "weekly": {
      const weekday = new Date(`${date}T12:00:00`)
        .toLocaleDateString("en-US", { weekday: "short" })
        .slice(0, 2)
        .toUpperCase();
      const interval = Math.max(1, recurrence.interval ?? 1);
      const count = recurrence.count ?? 10;
      return `RRULE:FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${weekday};COUNT=${count}`;
    }
    default:
      return undefined;
  }
}

/** Coarse import mapping when full pattern parsing is not needed. */
export function importRecurrenceKindFromGraph(
  pattern?: { type?: string },
): ItemRecurrence | undefined {
  if (!pattern?.type) return undefined;
  switch (pattern.type) {
    case "absoluteYearly":
      return { kind: "yearly" };
    case "absoluteMonthly":
      return { kind: "monthly" };
    case "relativeMonthly":
      return { kind: "monthlyLastDay" };
    case "daily":
      return { kind: "intervalDays", intervalDays: 1 };
    case "weekly":
      return { kind: "weekly", interval: 1, count: 10 };
    default:
      return { kind: "weekly", interval: 1, count: 10 };
  }
}
