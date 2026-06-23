export type AttachmentKind = "photo" | "pdf" | "voice" | "document" | "url";

export type AttachmentEntityType = "email" | "calendar" | "task";

export interface Attachment {
  id: string;
  householdId: string;
  itemType: AttachmentEntityType;
  itemId: string;
  storageKey: string;
  mimeType: string;
  filename: string;
  kind: AttachmentKind;
  url: string;
  createdAt: string;
}

export interface CreateAttachmentInput {
  itemType: AttachmentEntityType;
  itemId: string;
  kind: AttachmentKind;
  filename: string;
  mimeType: string;
  storageKey: string;
}
