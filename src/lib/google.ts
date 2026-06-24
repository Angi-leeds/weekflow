import type { GoogleIntegrationStatus } from "../../shared/googleApi";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchGoogleStatus(): Promise<GoogleIntegrationStatus> {
  return apiFetch<GoogleIntegrationStatus>("/api/google/status");
}

export function startGoogleConnect(): void {
  window.location.href = "/api/google/auth/start";
}

export async function disconnectGoogleAccount(accountId: string): Promise<void> {
  await apiFetch<void>(`/api/google/accounts/${accountId}`, { method: "DELETE" });
}
