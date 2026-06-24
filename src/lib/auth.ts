import type { AuthConfig, AuthUser, HouseholdInviteRow, InvitePreview, LoginResult, ResetTokenPreview, TotpSetupPayload } from "../../shared/auth";

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");

  if (!response.ok) {
    const body = isJson ? await response.json().catch(() => ({})) : {};
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!isJson) {
    throw new Error(`Expected JSON response from ${path} but got ${response.headers.get("content-type") ?? "unknown"}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  return authFetch<AuthConfig>("/api/auth/config");
}

export async function fetchCurrentUser(): Promise<{ user: AuthUser | null; enabled: boolean }> {
  const response = await fetch("/api/auth/user", { credentials: "same-origin" });
  if (response.status === 401) {
    const body = await response.json().catch(() => ({ enabled: true }));
    return { user: null, enabled: body.enabled ?? true };
  }
  if (!response.ok) {
    throw new Error("Failed to load current user");
  }
  return response.json() as Promise<{ user: AuthUser; enabled: boolean }>;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  return authFetch<LoginResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function verifyTotpLogin(challengeToken: string, code: string): Promise<AuthUser> {
  const result = await authFetch<{ user: AuthUser }>("/api/auth/totp/login", {
    method: "POST",
    body: JSON.stringify({ challengeToken, code }),
  });
  return result.user;
}

export async function register(input: {
  email: string;
  password: string;
  displayName?: string;
  inviteToken?: string;
}): Promise<AuthUser> {
  const result = await authFetch<{ user: AuthUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.user;
}

export async function requestPasswordReset(email: string): Promise<{ previewResetUrl?: string }> {
  return authFetch("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function fetchResetTokenPreview(token: string): Promise<ResetTokenPreview> {
  return authFetch<ResetTokenPreview>(`/api/auth/reset-password/${encodeURIComponent(token)}`);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await authFetch("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function fetchInvitePreview(token: string): Promise<InvitePreview> {
  return authFetch<InvitePreview>(`/api/auth/invite/${encodeURIComponent(token)}`);
}

export async function logout(): Promise<void> {
  await authFetch<void>("/api/auth/logout", { method: "POST" });
}

export async function startTotpSetup(): Promise<TotpSetupPayload> {
  return authFetch<TotpSetupPayload>("/api/auth/totp/setup", { method: "POST" });
}

export async function enableTotp(code: string): Promise<AuthUser> {
  const result = await authFetch<{ user: AuthUser }>("/api/auth/totp/enable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return result.user;
}

export async function disableTotp(password: string, code: string): Promise<AuthUser> {
  const result = await authFetch<{ user: AuthUser }>("/api/auth/totp/disable", {
    method: "POST",
    body: JSON.stringify({ password, code }),
  });
  return result.user;
}

export async function fetchSuperAdminOverview() {
  return authFetch<{
    signupMode: string;
    allowlistCount: number;
    userCount: number;
    superAdminEmailConfigured: boolean;
    authEnabled: boolean;
    allowlistEmails: string[];
    superAdminEmail: string | null;
  }>("/api/super-admin/overview");
}

export async function fetchSuperAdminUsers() {
  return authFetch<{ users: AuthUser[] }>("/api/super-admin/users");
}

export async function fetchSuperAdminInvites() {
  return authFetch<{ invites: HouseholdInviteRow[] }>("/api/super-admin/invites");
}

export async function createSuperAdminInvite(input: { email: string; displayName?: string }) {
  return authFetch<{ invite: HouseholdInviteRow; delivered: boolean; inviteUrl: string }>(
    "/api/super-admin/invites",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function revokeSuperAdminInvite(id: string): Promise<void> {
  await authFetch<void>(`/api/super-admin/invites/${id}`, { method: "DELETE" });
}

export function readAuthUrlParams(): { reset?: string; invite?: string } {
  const params = new URLSearchParams(window.location.search);
  const reset = params.get("reset") ?? undefined;
  const invite = params.get("invite") ?? undefined;
  return { reset, invite };
}

export function clearAuthUrlParams(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("reset") && !params.has("invite")) return;
  params.delete("reset");
  params.delete("invite");
  const query = params.toString();
  const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState({}, "", next);
}
