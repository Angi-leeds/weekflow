import type { ConnectedAccountPublic } from "../../shared/microsoftGraph";
import type { EmailMessage, IntegrationAccountDefaults } from "../types";
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

export function resolveAccountKeyForEmail(
  email: Pick<EmailMessage, "accountId" | "connectedAccountId">,
  accounts: ConnectedAccountPublic[],
  defaults: IntegrationAccountDefaults,
): string | undefined {
  if (email.connectedAccountId) return email.connectedAccountId;
  return resolveConnectedAccountId(accounts, defaults, email.accountId);
}

export function accountKeyForConnectedId(connectedAccountId: string): string {
  return microsoftAccountKey(connectedAccountId);
}
