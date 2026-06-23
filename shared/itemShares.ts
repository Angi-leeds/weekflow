export type ShareEntityType = "email" | "calendar" | "task";

export type BoardDisplay = "title_only" | "title_date" | "title_photo" | "invite_card";

export interface ItemShare {
  id: string;
  householdId: string;
  itemType: ShareEntityType;
  itemId: string;
  sharedToBoard: boolean;
  boardDisplay: BoardDisplay;
  sharedBy: string;
  createdAt: string;
}

export interface UpsertItemShareInput {
  itemType: ShareEntityType;
  itemId: string;
  sharedToBoard: boolean;
  boardDisplay?: BoardDisplay;
  sharedBy?: string;
}

export const BOARD_DISPLAY_LABELS: Record<BoardDisplay, string> = {
  title_only: "Title only",
  title_date: "Title + date",
  title_photo: "Title + photo",
  invite_card: "Invite card",
};

export const DEMO_SHARED_BY = "demo-user";
