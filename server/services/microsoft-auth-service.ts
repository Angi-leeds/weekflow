import { randomBytes } from "crypto";
import type { Request } from "express";
import {
  MICROSOFT_AUTHORITY_DEFAULT,
  MICROSOFT_GRAPH_SCOPES,
} from "../../shared/microsoftGraph";
import { friendlyMicrosoftAuthError } from "../../shared/microsoftAuthErrors";
import {
  isMicrosoftOAuthConfigured,
  upsertConnectedAccount,
} from "./connected-account-service";

const oauthStates = new Map<string, number>();
const STATE_TTL_MS = 10 * 60 * 1000;

function getMicrosoftClientId(): string {
  const value = process.env.MICROSOFT_CLIENT_ID;
  if (!value) throw new Error("MICROSOFT_CLIENT_ID is not configured");
  return value;
}

function getMicrosoftClientSecret(): string {
  const value = process.env.MICROSOFT_CLIENT_SECRET;
  if (!value) throw new Error("MICROSOFT_CLIENT_SECRET is not configured");
  return value;
}

export function getAppBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const protocol = req.get("x-forwarded-proto") ?? req.protocol;
  const host = req.get("x-forwarded-host") ?? req.get("host");
  return `${protocol}://${host}`;
}

export function getMicrosoftRedirectUri(req: Request): string {
  return (
    process.env.MICROSOFT_REDIRECT_URI?.replace(/\/$/, "") ??
    `${getAppBaseUrl(req)}/api/microsoft/auth/callback`
  );
}

function pruneOAuthStates(): void {
  const now = Date.now();
  for (const [state, createdAt] of oauthStates.entries()) {
    if (now - createdAt > STATE_TTL_MS) oauthStates.delete(state);
  }
}

export function createOAuthState(): string {
  pruneOAuthStates();
  const state = randomBytes(24).toString("hex");
  oauthStates.set(state, Date.now());
  return state;
}

export function consumeOAuthState(state: string | undefined): boolean {
  if (!state) return false;
  pruneOAuthStates();
  const createdAt = oauthStates.get(state);
  if (!createdAt) return false;
  oauthStates.delete(state);
  return Date.now() - createdAt <= STATE_TTL_MS;
}

export function buildMicrosoftAuthorizeUrl(
  req: Request,
  state: string,
  options?: { promptConsent?: boolean },
): string {
  const authority = process.env.MICROSOFT_AUTHORITY ?? MICROSOFT_AUTHORITY_DEFAULT;
  const params = new URLSearchParams({
    client_id: getMicrosoftClientId(),
    response_type: "code",
    redirect_uri: getMicrosoftRedirectUri(req),
    response_mode: "query",
    scope: MICROSOFT_GRAPH_SCOPES.join(" "),
    state,
  });
  if (options?.promptConsent) {
    params.set("prompt", "consent");
  }
  return `${authority}/oauth2/v2.0/authorize?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

interface GraphProfile {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}

export async function exchangeMicrosoftAuthCode(
  req: Request,
  code: string,
): Promise<{ accountId: string; email: string }> {
  if (!isMicrosoftOAuthConfigured()) {
    throw new Error("Microsoft OAuth is not configured");
  }

  const authority = process.env.MICROSOFT_AUTHORITY ?? MICROSOFT_AUTHORITY_DEFAULT;
  const body = new URLSearchParams({
    client_id: getMicrosoftClientId(),
    client_secret: getMicrosoftClientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: getMicrosoftRedirectUri(req),
    scope: MICROSOFT_GRAPH_SCOPES.join(" "),
  });

  const tokenResponse = await fetch(`${authority}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenResponse.ok) {
    const detail = await tokenResponse.text();
    throw new Error(`Token exchange failed (${tokenResponse.status}): ${detail}`);
  }

  const tokens = (await tokenResponse.json()) as TokenResponse;
  const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error(`Failed to load Microsoft profile (${profileResponse.status})`);
  }

  const profile = (await profileResponse.json()) as GraphProfile;
  const email = profile.mail ?? profile.userPrincipalName ?? "unknown@outlook.com";
  const expiresAt =
    tokens.expires_in != null
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

  const record = await upsertConnectedAccount({
    provider: "microsoft",
    providerAccountId: profile.id,
    email,
    displayName: profile.displayName ?? email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt,
    scopes: tokens.scope ?? MICROSOFT_GRAPH_SCOPES.join(" "),
  });

  return { accountId: record.id, email };
}

export async function refreshMicrosoftAccessToken(
  accountId: string,
  refreshToken: string,
  grantedScopes?: string | null,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: string | null }> {
  const authority = process.env.MICROSOFT_AUTHORITY ?? MICROSOFT_AUTHORITY_DEFAULT;
  const body = new URLSearchParams({
    client_id: getMicrosoftClientId(),
    client_secret: getMicrosoftClientSecret(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const scope = grantedScopes?.trim();
  if (scope) {
    body.set("scope", scope);
  }

  const response = await fetch(`${authority}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(friendlyMicrosoftAuthError(`Token refresh failed (${response.status}): ${detail}`));
  }

  const tokens = (await response.json()) as TokenResponse;
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? refreshToken,
    expiresAt:
      tokens.expires_in != null
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
  };
}
