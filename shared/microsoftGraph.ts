export const MICROSOFT_GRAPH_SCOPES = [
  "offline_access",
  "User.Read",
  "Mail.ReadWrite",
  "Mail.Send",
  "Mail.Read.Shared",
  "MailboxSettings.ReadWrite",
  "Calendars.ReadWrite",
  "Calendars.Read.Shared",
  "Tasks.ReadWrite",
  "Contacts.ReadWrite",
  "Files.Read.All",
  "Files.ReadWrite",
  "Notes.ReadWrite",
  "OnlineMeetings.ReadWrite",
  "Chat.Read",
] as const;

export type MicrosoftGraphScope = (typeof MICROSOFT_GRAPH_SCOPES)[number];

export const MICROSOFT_AUTHORITY_DEFAULT = "https://login.microsoftonline.com/common";

export const MICROSOFT_GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export interface ConnectedAccountPublic {
  id: string;
  provider: "microsoft";
  email: string;
  displayName: string;
  providerAccountId: string;
  connectedAt: string;
}

export interface MicrosoftIntegrationStatus {
  configured: boolean;
  connected: boolean;
  accounts: ConnectedAccountPublic[];
}

export interface ProviderItemMapping {
  id: string;
  householdId: string;
  connectedAccountId: string;
  itemType: "calendar" | "email" | "task";
  localItemId: string;
  externalId: string;
  provider: "microsoft";
  createdAt: string;
}

export interface GraphCalendarEventResult {
  externalId: string;
  webLink?: string;
  photoAttached?: boolean;
}

export interface GraphMailFolderDto {
  id: string;
  graphFolderId: string;
  label: string;
  accountId: string;
  connectedAccountId: string;
  wellKnown?: "inbox" | "sentitems" | "drafts" | "deleteditems";
  parentFolderId?: string;
}

export interface GraphMailAttachmentDto {
  id: string;
  name: string;
  contentType?: string;
  size?: number;
  isInline?: boolean;
  contentId?: string;
}

export type GraphCalendarKind = "owned" | "shared" | "subscribed";

export interface GraphCalendarDto {
  id: string;
  graphCalendarId: string;
  name: string;
  accountId: string;
  connectedAccountId: string;
  isDefault?: boolean;
  colour?: string;
  canEdit?: boolean;
  ownerName?: string;
  ownerEmail?: string;
  kind?: GraphCalendarKind;
  /** When loaded from a delegated shared mailbox. */
  sharedMailboxEmail?: string;
}

export interface GraphTodoListDto {
  id: string;
  graphListId: string;
  name: string;
  accountId: string;
  connectedAccountId: string;
  isDefault?: boolean;
}

export interface GraphDriveItemDto {
  id: string;
  name: string;
  webUrl?: string;
  accountId: string;
  connectedAccountId: string;
  parentId?: string;
}
