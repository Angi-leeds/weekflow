/** Google OAuth scopes for Phase 10a connect (read-only mail + calendar). */
export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

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
