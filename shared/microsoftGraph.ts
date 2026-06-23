export const MICROSOFT_GRAPH_SCOPES = [
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
  "Calendars.ReadWrite",
  "Tasks.ReadWrite",
  "Files.Read.All",
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
}
