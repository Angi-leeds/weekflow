export type EntityType = "email" | "calendar" | "task" | "note" | "board_pin" | "folder_ref";

export type LinkKind = "created_from" | "relates_to" | "follow_up" | "folder_ref";

export interface ItemLink {
  id: string;
  householdId: string;
  fromType: EntityType;
  fromId: string;
  toType: EntityType;
  toId: string;
  kind: LinkKind;
  folderUrl?: string | null;
  folderProvider?: string | null;
  createdAt: string;
}

export interface CreateLinkInput {
  fromType: EntityType;
  fromId: string;
  toType: EntityType;
  toId: string;
  kind: LinkKind;
  folderUrl?: string;
  folderProvider?: string;
}

export const DEMO_HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000001";

export const LINK_KIND_LABELS: Record<LinkKind, string> = {
  created_from: "Created from",
  relates_to: "Related",
  follow_up: "Follow-up",
  folder_ref: "Folder",
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  email: "Email",
  calendar: "Calendar",
  task: "Task",
  note: "Note",
  board_pin: "Board",
  folder_ref: "Folder",
};
