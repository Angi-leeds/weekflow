/** Google OAuth scopes for Phase 10a connect (read-only mail + calendar). */
export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive",
] as const;

export interface GoogleCalendarSyncInput {
  localItemId: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  notes?: string;
  calendarId?: string;
  reminderPreset?: string;
  reminderCustomMinutes?: number;
  reminderAt?: string;
}

export interface GoogleCalendarEventResult {
  externalId: string;
  htmlLink?: string;
}

export interface GoogleConnectedAccountPublic {
  id: string;
  provider: "google";
  email: string;
  displayName: string;
  providerAccountId: string;
  connectedAt: string;
}

export interface GoogleIntegrationStatus {
  configured: boolean;
  connected: boolean;
  accounts: GoogleConnectedAccountPublic[];
}

export interface GoogleMailFolderDto {
  id: string;
  labelId: string;
  label: string;
  accountId: string;
  connectedAccountId: string;
  wellKnown?: "inbox" | "sentitems" | "drafts" | "deleteditems";
}

export interface GoogleDriveFolderDto {
  id: string;
  name: string;
  webUrl?: string;
  accountId: string;
  connectedAccountId: string;
  parentId?: string;
}

export interface GoogleCalendarDto {
  id: string;
  googleCalendarId: string;
  name: string;
  accountId: string;
  connectedAccountId: string;
  isDefault?: boolean;
}
