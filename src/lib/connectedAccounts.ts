import type { GoogleIntegrationStatus } from "../../shared/googleApi";
import type { ConnectedAccountPublic, MicrosoftIntegrationStatus } from "../../shared/microsoftGraph";
import { MOCK_CALENDAR_ACCOUNTS, MOCK_EMAIL_ACCOUNTS, MOCK_EMAIL_FOLDERS } from "../mockData";
import type { EmailAccount, EmailFolder } from "../types";
import { googleAccountKey } from "./google";
import { microsoftAccountKey } from "./microsoft";

export const MICROSOFT_PROVIDER_COLOUR = "#0078d4";
export const GOOGLE_PROVIDER_COLOUR = "#4285f4";

export function isMockEmail(email: { provider?: string; externalId?: string }): boolean {
  return email.provider !== "microsoft" && email.provider !== "google" && !email.externalId;
}

export function isMockCalendarItem(item: { provider?: string; externalId?: string; id?: string }): boolean {
  if (item.provider === "microsoft" || item.provider === "google" || item.externalId) return false;
  if (item.id?.startsWith("graph-") || item.id?.startsWith("gcal-")) return false;
  return true;
}

export function isMockNote(note: { provider?: string; externalId?: string; id?: string }): boolean {
  if (note.provider === "microsoft" || note.externalId) return false;
  if (note.id?.startsWith("graph-note-")) return false;
  return note.provider === "mock" || !note.provider;
}

export function microsoftEmailAccount(account: ConnectedAccountPublic): EmailAccount {
  const key = microsoftAccountKey(account.id);
  return {
    id: key,
    label: account.displayName || "Outlook",
    email: account.email,
    provider: "Outlook",
    colour: MICROSOFT_PROVIDER_COLOUR,
  };
}

export function googleEmailAccount(
  account: GoogleIntegrationStatus["accounts"][number],
): EmailAccount {
  const key = googleAccountKey(account.id);
  return {
    id: key,
    label: account.displayName || "Gmail",
    email: account.email,
    provider: "Gmail",
    colour: GOOGLE_PROVIDER_COLOUR,
  };
}

export function microsoftCalendarAccount(account: ConnectedAccountPublic): EmailAccount {
  const emailAccount = microsoftEmailAccount(account);
  return {
    ...emailAccount,
    label: `${emailAccount.label} calendar`,
  };
}

export function googleCalendarAccount(
  account: GoogleIntegrationStatus["accounts"][number],
): EmailAccount {
  const emailAccount = googleEmailAccount(account);
  return {
    ...emailAccount,
    label: `${emailAccount.label} calendar`,
  };
}

export function resolveEmailAccounts(
  microsoftStatus: MicrosoftIntegrationStatus | null,
  googleStatus: GoogleIntegrationStatus | null = null,
): EmailAccount[] {
  const microsoftAccounts = (microsoftStatus?.accounts ?? []).map(microsoftEmailAccount);
  const googleAccounts = (googleStatus?.accounts ?? []).map(googleEmailAccount);
  const connected = [...microsoftAccounts, ...googleAccounts];
  if (connected.length > 0) return connected;
  return [...MOCK_EMAIL_ACCOUNTS];
}

export function resolveCalendarAccounts(
  microsoftStatus: MicrosoftIntegrationStatus | null,
  googleStatus: GoogleIntegrationStatus | null = null,
): EmailAccount[] {
  const microsoftAccounts = (microsoftStatus?.accounts ?? []).map(microsoftCalendarAccount);
  const googleAccounts = (googleStatus?.accounts ?? []).map(googleCalendarAccount);
  const connected = [...microsoftAccounts, ...googleAccounts];
  if (connected.length > 0) return connected;
  return [...MOCK_CALENDAR_ACCOUNTS];
}

export function resolveEmailFolders(
  accounts: EmailAccount[],
  graphFolders: EmailFolder[] = [],
): EmailFolder[] {
  const connectedAccounts = accounts.filter(
    (account) => account.id.startsWith("ms-") || account.id.startsWith("google-"),
  );
  if (connectedAccounts.length === 0) return [...MOCK_EMAIL_FOLDERS];
  if (graphFolders.length > 0) return graphFolders;

  return connectedAccounts.flatMap((account) => [
    {
      id: `${account.id}-inbox`,
      label: "Inbox",
      accountId: account.id,
      wellKnown: "inbox" as const,
    },
  ]);
}

export function useRealMicrosoftData(
  status: MicrosoftIntegrationStatus | null,
  loading: boolean,
): boolean {
  return !loading && Boolean(status?.connected);
}

export function useRealGoogleData(
  status: GoogleIntegrationStatus | null,
  loading: boolean,
): boolean {
  return !loading && Boolean(status?.connected);
}
