import type { AuthConfig, AuthUser } from "../../shared/auth";

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

export async function login(email: string, password: string): Promise<AuthUser> {
  const result = await authFetch<{ user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return result.user;
}

export async function register(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthUser> {
  const result = await authFetch<{ user: AuthUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.user;
}

export async function logout(): Promise<void> {
  await authFetch<void>("/api/auth/logout", { method: "POST" });
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
