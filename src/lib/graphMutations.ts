import type { CalendarItem, Category } from "../types";
import {
  completeMicrosoftTodo,
  deleteMicrosoftCalendarEvent,
  deleteMicrosoftTodo,
  syncCalendarToMicrosoft,
  syncMicrosoftTodo,
} from "./microsoft";
import { syncCalendarToGoogle } from "./google";

export function findCalendarItemById(
  id: string,
  localItems: CalendarItem[],
  graphItems: CalendarItem[],
): CalendarItem | undefined {
  return (
    localItems.find((item) => item.id === id) ??
    graphItems.find((item) => item.id === id)
  );
}

export function isMicrosoftGraphItem(item: CalendarItem): boolean {
  return item.provider === "microsoft" && Boolean(item.externalId && item.connectedAccountId);
}

export function isGoogleGraphItem(item: CalendarItem): boolean {
  return item.provider === "google" && Boolean(item.externalId && item.connectedAccountId);
}

export function isGraphSourcedItem(item: CalendarItem): boolean {
  return (
    item.id.startsWith("graph-") ||
    item.id.startsWith("graph-todo-") ||
    item.id.startsWith("gcal-") ||
    Boolean(item.externalId && item.provider && item.provider !== "local")
  );
}

import { isAnyTaskItem } from "./providerTasks";

function isTaskItem(item: CalendarItem, categories: Category[]): boolean {
  return isAnyTaskItem(item, categories)
}

export async function syncItemToProvider(
  item: CalendarItem,
  categories: Category[],
  options: {
    connectedAccountId: string;
    defaultCalendarId?: string;
    defaultTodoListId?: string;
    photo?: { storageKey: string; mimeType: string; filename: string };
    useGoogle: boolean;
  },
): Promise<{
  externalId: string;
  todoListId?: string;
  photoAttached?: boolean;
  webLink?: string;
}> {
  if (options.useGoogle) {
    if (isTaskItem(item, categories)) {
      throw new Error("Tasks sync to Microsoft To Do only");
    }
    const result = await syncCalendarToGoogle(
      options.connectedAccountId,
      item,
      options.defaultCalendarId,
    );
    return { externalId: result.externalId, webLink: result.webLink };
  }

  if (isTaskItem(item, categories)) {
    const result = await syncMicrosoftTodo(
      options.connectedAccountId,
      item,
      item.todoListId ?? options.defaultTodoListId,
    );
    return { externalId: result.externalId, todoListId: result.todoListId };
  }

  const result = await syncCalendarToMicrosoft(
    options.connectedAccountId,
    item,
    options.photo,
    item.calendarId ?? options.defaultCalendarId,
  );
  return {
    externalId: result.externalId,
    webLink: result.webLink,
    photoAttached: result.photoAttached,
  };
}

export async function deleteItemFromProvider(
  item: CalendarItem,
  categories: Category[],
): Promise<void> {
  if (!item.externalId || !item.connectedAccountId) return;

  if (item.provider === "microsoft") {
    if (isTaskItem(item, categories)) {
      const todoListId = item.todoListId;
      if (!todoListId) {
        throw new Error("Cannot delete task: To Do list id is missing");
      }
      await deleteMicrosoftTodo(item.connectedAccountId, item.externalId, todoListId);
      return;
    }
    await deleteMicrosoftCalendarEvent(
      item.connectedAccountId,
      item.externalId,
      item.calendarId,
    );
  }
}

export async function toggleTaskCompleteOnProvider(
  item: CalendarItem,
  categories: Category[],
  completed: boolean,
): Promise<void> {
  if (!isTaskItem(item, categories)) return;
  if (item.provider !== "microsoft" || !item.externalId || !item.connectedAccountId) return;
  const todoListId = item.todoListId;
  if (!todoListId) {
    throw new Error("Cannot update task: To Do list id is missing");
  }
  await completeMicrosoftTodo(
    item.connectedAccountId,
    item.externalId,
    todoListId,
    completed,
  );
}
