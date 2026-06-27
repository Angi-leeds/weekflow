import type { BoardLayoutMode, KanbanGroupBy } from "../../shared/boardLayout";

const LAYOUT_KEY = "weekflow-board-layout";
const KANBAN_KEY = "weekflow-board-kanban-group";
const SLEEP_KEY = "weekflow-board-sleep-mode";

export interface BoardSettings {
  layout: BoardLayoutMode;
  kanbanGroupBy: KanbanGroupBy;
  sleepModeEnabled: boolean;
}

export function loadBoardLayout(): BoardLayoutMode {
  const value = localStorage.getItem(LAYOUT_KEY);
  if (value === "freeform" || value === "kanban" || value === "split") return value;
  return "split";
}

export function saveBoardLayout(mode: BoardLayoutMode): void {
  localStorage.setItem(LAYOUT_KEY, mode);
}

export function loadKanbanGroupBy(): KanbanGroupBy {
  return localStorage.getItem(KANBAN_KEY) === "status" ? "status" : "people";
}

export function saveKanbanGroupBy(groupBy: KanbanGroupBy): void {
  localStorage.setItem(KANBAN_KEY, groupBy);
}

export function loadSleepModeEnabled(): boolean {
  return localStorage.getItem(SLEEP_KEY) === "true";
}

export function saveSleepModeEnabled(enabled: boolean): void {
  localStorage.setItem(SLEEP_KEY, enabled ? "true" : "false");
}

export function loadBoardSettings(): BoardSettings {
  return {
    layout: loadBoardLayout(),
    kanbanGroupBy: loadKanbanGroupBy(),
    sleepModeEnabled: loadSleepModeEnabled(),
  };
}

export function saveBoardSettings(settings: BoardSettings): void {
  saveBoardLayout(settings.layout);
  saveKanbanGroupBy(settings.kanbanGroupBy);
  saveSleepModeEnabled(settings.sleepModeEnabled);
}
