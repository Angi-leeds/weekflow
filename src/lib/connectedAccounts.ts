import type { ConnectedAccountPublic, MicrosoftIntegrationStatus } from "../../shared/microsoftGraph";
import { MOCK_CALENDAR_ACCOUNTS, MOCK_EMAIL_ACCOUNTS, MOCK_EMAIL_FOLDERS } from "../mockData";
import type { EmailAccount, EmailFolder } from "../types";
import { microsoftAccountKey } from "./microsoft";

export const MICROSOFT_PROVIDER_COLOUR = "#0078d4";

export function isMockEmail(email: { provider?: string; externalId?: string }): boolean {
  return email.provider !== "microsoft" && !email.externalId;
}

export function isMockCalendarItem(item: { provider?: string; externalId?: string; id?: string }): boolean {
  if (item.provider === "microsoft" || item.externalId) return false;
  if (item.id?.startsWith("graph-")) return false;
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

export function microsoftCalendarAccount(account: ConnectedAccountPublic): EmailAccount {
  const emailAccount = microsoftEmailAccount(account);
  return {
    ...emailAccount,
    label: `${emailAccount.label} calendar`,
  };
}

export function resolveEmailAccounts(status: MicrosoftIntegrationStatus | null): EmailAccount[] {
  const microsoftAccounts = (status?.accounts ?? []).map(microsoftEmailAccount);
  if (microsoftAccounts.length > 0) return microsoftAccounts;
  return [...MOCK_EMAIL_ACCOUNTS];
}

export function resolveCalendarAccounts(status: MicrosoftIntegrationStatus | null): EmailAccount[] {
  const microsoftAccounts = (status?.accounts ?? []).map(microsoftCalendarAccount);
  if (microsoftAccounts.length > 0) return microsoftAccounts;
  return [...MOCK_CALENDAR_ACCOUNTS];
}

export function resolveEmailFolders(accounts: EmailAccount[]): EmailFolder[] {
  const microsoftAccounts = accounts.filter((account) => account.id.startsWith("ms-"));
  if (microsoftAccounts.length === 0) return [...MOCK_EMAIL_FOLDERS];

  return microsoftAccounts.flatMap((account) => [
    {
      id: `${account.id}-inbox`,
      label: "Inbox",
      accountId: account.id,
    },
  ]);
}

export function useRealMicrosoftData(status: MicrosoftIntegrationStatus | null, loading: boolean): boolean {
  return !loading && Boolean(status?.connected);
}
