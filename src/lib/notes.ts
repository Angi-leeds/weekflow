import type { Note } from "../types";
import { generateId } from "../dateUtils";

export const NOTES_STORAGE_KEY = "weekflow-notes-v1";

export const DEFAULT_NOTE_COLOUR = "#FFF4B8";

export const NOTE_COLOURS = [
  "#FFF4B8",
  "#FFE8A3",
  "#FFD966",
  "#F9E79F",
  "#FDEBD0",
  "#D5F5E3",
  "#D6EAF8",
  "#E8DAEF",
] as const;

export const INITIAL_NOTES: Note[] = [
  {
    id: "note-demo-1",
    title: "Refresh preview tip",
    body: '"Refresh" — not all edits auto-update on preview. You will burn through credits telling the agent "Still broken".',
    createdAt: "2026-06-10T09:15:00.000Z",
    updatedAt: "2026-06-18T14:22:00.000Z",
    colour: DEFAULT_NOTE_COLOUR,
    source: "mock",
    provider: "mock",
  },
  {
    id: "note-demo-2",
    title: "npm run db:migrate",
    body: "npm run db:migrate",
    createdAt: "2026-06-12T11:00:00.000Z",
    updatedAt: "2026-06-12T11:00:00.000Z",
    colour: NOTE_COLOURS[1],
    source: "mock",
    provider: "mock",
  },
  {
    id: "note-demo-3",
    title: "Can we discuss test",
    body: "Can we discuss test coverage before Friday?",
    createdAt: "2026-06-14T08:30:00.000Z",
    updatedAt: "2026-06-14T08:30:00.000Z",
    colour: NOTE_COLOURS[2],
    source: "mock",
    provider: "mock",
  },
  {
    id: "note-demo-4",
    title: "Menagerie database URL",
    body: "My-menagerie database url — check Replit Secrets → DATABASE_URL",
    createdAt: "2026-06-08T16:45:00.000Z",
    updatedAt: "2026-06-08T16:45:00.000Z",
    colour: DEFAULT_NOTE_COLOUR,
    source: "mock",
    provider: "mock",
  },
  {
    id: "note-demo-5",
    title: "Insurance records",
    body: "Insurance records — The renewal is due end of month. Call broker Monday.",
    createdAt: "2026-06-05T10:00:00.000Z",
    updatedAt: "2026-06-05T10:00:00.000Z",
    colour: NOTE_COLOURS[3],
    source: "mock",
    provider: "mock",
  },
  {
    id: "note-demo-6",
    title: "Oliver rang",
    body: "Oliver rang to check — callback before 4pm.",
    createdAt: "2026-06-20T15:10:00.000Z",
    updatedAt: "2026-06-20T15:10:00.000Z",
    colour: NOTE_COLOURS[4],
    source: "mock",
    provider: "mock",
  },
];

export function loadStoredNotes(): Note[] | null {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredNotes(notes: Note[]): void {
  const localOnly = notes.filter((note) => note.provider !== "microsoft" && !note.externalId);
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(localOnly));
}

export function isEditableNote(note: Note): boolean {
  return note.provider !== "microsoft" && !note.externalId;
}

/** Weekflow-native notes that sync to the household account (not OneNote or demo data). */
export function isSyncableLocalNote(note: Note): boolean {
  return (
    note.provider !== "microsoft" &&
    note.provider !== "mock" &&
    !note.externalId
  );
}

export function extractSyncableLocalNotes(notes: Note[]): Note[] {
  return notes.filter(isSyncableLocalNote);
}

export function notePreview(note: Note, maxLength = 80): string {
  const line = note.body.split("\n").find((entry) => entry.trim()) ?? note.title;
  if (line.length <= maxLength) return line;
  return `${line.slice(0, maxLength - 1)}…`;
}

export function noteMatchesSearch(note: Note, query: string): boolean {
  const q = query.toLowerCase();
  return (
    note.title.toLowerCase().includes(q) ||
    note.body.toLowerCase().includes(q) ||
    note.categories?.some((category) => category.toLowerCase().includes(q)) === true
  );
}

export function isWithinLastDays(isoDate: string, days: number): boolean {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(isoDate).getTime() >= cutoff;
}

export function createLocalNote(input: { title: string; body: string; colour?: string }): Note {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: input.title.trim() || "(Untitled note)",
    body: input.body,
    createdAt: now,
    updatedAt: now,
    colour: input.colour ?? DEFAULT_NOTE_COLOUR,
    source: "local",
    provider: "local",
  };
}
