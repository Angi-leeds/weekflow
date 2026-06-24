import { randomBytes } from "crypto";
import type { Request } from "express";
import { GOOGLE_OAUTH_SCOPES } from "../../shared/googleApi";
import {
  isGoogleOAuthConfigured,
  upsertConnectedAccount,
} from "./connected-account-service";
import { getAppBaseUrl } from "./microsoft-auth-service";

const oauthStates = new Map<string, number>();
const STATE_TTL_MS = 10 * 60 * 1000;

function getGoogleClientId(): string {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value) throw new Error("GOOGLE_CLIENT_ID is not configured");
  return value;
}

function getGoogleClientSecret(): string {
  const value = process.env.GOOGLE_CLIENT_SECRET;
  if (!value) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  return value;
}

export function getGoogleRedirectUri(req: Request): string {
  return (
    process.env.GOOGLE_REDIRECT_URI?.replace(/\/$/, "") ??
    `${getAppBaseUrl(req)}/api/google/auth/callback`
  );
}

function pruneOAuthStates(): void {
  const now = Date.now();
  for (const [state, createdAt] of oauthStates.entries()) {
    if (now - createdAt > STATE_TTL_MS) oauthStates.delete(state);
  }
}

export function createGoogleOAuthState(): string {
  pruneOAuthStates();
  const state = randomBytes(24).toString("hex");
  oauthStates.set(state, Date.now());
  return state;
}

export function consumeGoogleOAuthState(state: string | undefined): boolean {
  if (!state) return false;
  pruneOAuthStates();
  const createdAt = oauthStates.get(state);
  if (!createdAt) return false;
  oauthStates.delete(state);
  return Date.now() - createdAt <= STATE_TTL_MS;
}

export function buildGoogleAuthorizeUrl(req: Request, state: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    response_type: "code",
    redirect_uri: getGoogleRedirectUri(req),
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

interface GoogleProfile {
  id: string;
  email?: string;
  name?: string;
}

export async function exchangeGoogleAuthCode(
  req: Request,
  code: string,
): Promise<{ accountId: string; email: string }> {
  if (!isGoogleOAuthConfigured()) {
    throw new Error("Google OAuth is not configured");
  }

  const body = new URLSearchParams({
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: getGoogleRedirectUri(req),
  });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenResponse.ok) {
    const detail = await tokenResponse.text();
    throw new Error(`Google token exchange failed (${tokenResponse.status}): ${detail}`);
  }

  const tokens = (await tokenResponse.json()) as TokenResponse;
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error(`Failed to load Google profile (${profileResponse.status})`);
  }

  const profile = (await profileResponse.json()) as GoogleProfile;
  const email = profile.email ?? "unknown@gmail.com";
  const expiresAt =
    tokens.expires_in != null
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

  const record = await upsertConnectedAccount({
    provider: "google",
    providerAccountId: profile.id,
    email,
    displayName: profile.name ?? email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt,
    scopes: tokens.scope ?? GOOGLE_OAUTH_SCOPES.join(" "),
  });

  return { accountId: record.id, email };
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: string | null }> {
  const body = new URLSearchParams({
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google token refresh failed (${response.status}): ${detail}`);
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
