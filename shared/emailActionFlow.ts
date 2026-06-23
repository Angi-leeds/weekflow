import type { BoardDisplay } from "./itemShares";

export interface EmailActionFlowOptions {
  createCalendar: boolean;
  createTask: boolean;
  shareToBoard: boolean;
  tagFolder: boolean;
  autoCopy: boolean;
  dueDate: string;
  taskLeadDays: number;
  folderId?: string;
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
  boardDisplay: "title_date",
};
