import type { CalendarItem } from "../types";
import { initialItems } from "../mockData";

const STORAGE_KEY = "weekflow-items";

export function loadStoredItems(): CalendarItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CalendarItem[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredItems(items: CalendarItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function defaultItems(): CalendarItem[] {
  return initialItems;
}
