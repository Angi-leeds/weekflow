import type { GoogleIntegrationStatus } from "../../shared/googleApi";
import type { ConnectedAccountPublic, MicrosoftIntegrationStatus } from "../../shared/microsoftGraph";
import type { EmailMessage, IntegrationAccountDefaults } from "../types";
import { googleAccountKey } from "./google";
import { microsoftAccountKey } from "./microsoft";

export function resolveConnectedAccountId(
  accounts: ConnectedAccountPublic[],
  defaults: IntegrationAccountDefaults,
  preferredAccountKey?: string,
): string | undefined {
  if (preferredAccountKey?.startsWith("ms-")) {
    const fromKey = preferredAccountKey.slice(3);
    if (accounts.some((account) => account.id === fromKey)) {
      return fromKey;
    }
  }

  if (
    defaults.defaultMicrosoftAccountId &&
    accounts.some((account) => account.id === defaults.defaultMicrosoftAccountId)
  ) {
    return defaults.defaultMicrosoftAccountId;
  }

  return accounts[0]?.id;
}

export function resolveGoogleConnectedAccountId(
  accounts: GoogleIntegrationStatus["accounts"],
  defaults: IntegrationAccountDefaults,
  preferredAccountKey?: string,
): string | undefined {
  if (preferredAccountKey?.startsWith("google-")) {
    const fromKey = preferredAccountKey.slice(7);
    if (accounts.some((account) => account.id === fromKey)) {
      return fromKey;
    }
  }

  if (
    defaults.defaultGoogleAccountId &&
    accounts.some((account) => account.id === defaults.defaultGoogleAccountId)
  ) {
    return defaults.defaultGoogleAccountId;
  }

  if (
    defaults.googleCalendar?.defaultAccountId &&
    accounts.some((account) => account.id === defaults.googleCalendar?.defaultAccountId)
  ) {
    return defaults.googleCalendar.defaultAccountId;
  }

  if (
    defaults.googleEmail?.defaultAccountId &&
    accounts.some((account) => account.id === defaults.googleEmail?.defaultAccountId)
  ) {
    return defaults.googleEmail.defaultAccountId;
  }

  return accounts[0]?.id;
}

export function resolveDefaultComposeAccountId(
  defaults: IntegrationAccountDefaults,
  microsoftStatus: MicrosoftIntegrationStatus | null,
  googleStatus: GoogleIntegrationStatus | null,
): string | undefined {
  const microsoftAccounts = microsoftStatus?.accounts ?? [];
  const googleAccounts = googleStatus?.accounts ?? [];

  if (
    defaults.defaultGoogleAccountId &&
    googleAccounts.some((account) => account.id === defaults.defaultGoogleAccountId)
  ) {
    return defaults.defaultGoogleAccountId;
  }

  if (
    defaults.defaultMicrosoftAccountId &&
    microsoftAccounts.some((account) => account.id === defaults.defaultMicrosoftAccountId)
  ) {
    return defaults.defaultMicrosoftAccountId;
  }

  return microsoftAccounts[0]?.id ?? googleAccounts[0]?.id;
}

export function resolveAccountKeyForEmail(
  email: Pick<EmailMessage, "accountId" | "connectedAccountId">,
  accounts: ConnectedAccountPublic[],
  defaults: IntegrationAccountDefaults,
): string | undefined {
  if (email.connectedAccountId) return email.connectedAccountId;
  return resolveConnectedAccountId(accounts, defaults, email.accountId);
}

export function accountKeyForConnectedId(
  connectedAccountId: string,
  provider: "microsoft" | "google" = "microsoft",
): string {
  return provider === "google"
    ? googleAccountKey(connectedAccountId)
    : microsoftAccountKey(connectedAccountId);
}
