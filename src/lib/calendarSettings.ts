import type { CalendarFilter } from "../types";

const FILTER_KEY = "weekflow-calendar-filter";

export function loadCalendarFilter(): CalendarFilter {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return { mode: "merged" };
    const parsed = JSON.parse(raw) as CalendarFilter;
    if (parsed.mode === "account" && typeof parsed.accountId === "string") {
      return parsed;
    }
    return { mode: "merged" };
  } catch {
    return { mode: "merged" };
  }
}

export function saveCalendarFilter(filter: CalendarFilter): void {
  localStorage.setItem(FILTER_KEY, JSON.stringify(filter));
}
