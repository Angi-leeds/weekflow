import type { CalendarFilter, CalendarSourcePreferences } from "../types";

const FILTER_KEY = "weekflow-calendar-filter";

export function loadCalendarFilter(): CalendarFilter {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return { mode: "merged" };
    const parsed = JSON.parse(raw) as CalendarFilter;
    if (parsed.mode === "account" && typeof parsed.accountId === "string") {
      return parsed;
    }
    if (parsed.mode === "preset" && typeof parsed.presetId === "string") {
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

/** Drop account/preset filters that no longer match connected data. */
export function sanitizeCalendarFilter(
  filter: CalendarFilter,
  accountIds: string[],
  prefs?: CalendarSourcePreferences,
): CalendarFilter {
  if (filter.mode === "merged") return filter;
  if (filter.mode === "account") {
    if (accountIds.includes(filter.accountId)) return filter;
    return { mode: "merged" };
  }
  if (filter.mode === "preset" && prefs) {
    if (prefs.presets.some((preset) => preset.id === filter.presetId)) return filter;
    return { mode: "merged" };
  }
  return { mode: "merged" };
}
