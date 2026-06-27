import type { BoardDisplay } from "./itemShares";

export type TaskReminderKind = "offset" | "date";

export interface EmailActionFlowOptions {
  createCalendar: boolean;
  createTask: boolean;
  shareToBoard: boolean;
  tagFolder: boolean;
  autoCopy: boolean;
  dueDate: string;
  /** Offset mode: days before due date. */
  taskLeadDays: number;
  taskReminderKind: TaskReminderKind;
  /** Date mode: explicit reminder date (ISO yyyy-mm-dd). */
  taskReminderDate?: string;
  folderId?: string;
  folderUrl?: string;
  folderLabel?: string;
  folderProvider?: string;
  boardDisplay: BoardDisplay;
}

export const DEFAULT_EMAIL_ACTION_FLOW: EmailActionFlowOptions = {
  createCalendar: true,
  createTask: true,
  shareToBoard: false,
  tagFolder: true,
  autoCopy: true,
  dueDate: "",
  taskLeadDays: 3,
  taskReminderKind: "offset",
  taskReminderDate: undefined,
  boardDisplay: "title_date",
};
