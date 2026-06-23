import type { SignupMode } from "../../shared/auth";

export function isAuthEnabled(): boolean {
  return Boolean(process.env.SESSION_SECRET?.trim());
}

export function getSignupMode(): SignupMode {
  const raw = (process.env.SIGNUP_MODE ?? "closed").toLowerCase();
  if (raw === "open" || raw === "allowlist") {
    return raw;
  }
  return "closed";
}

export function getSignupAllowlist(): string[] {
  const raw = process.env.SIGNUP_ALLOWLIST_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getSuperAdminEmail(): string | null {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  return email || null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function canRegisterEmail(email: string, existingUserCount: number): {
  allowed: boolean;
  reason?: string;
} {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    return { allowed: false, reason: "invalid_email" };
  }

  const mode = getSignupMode();
  const allowlist = getSignupAllowlist();
  const superAdminEmail = getSuperAdminEmail();
  const onAllowlist = allowlist.includes(normalized);
  const isSuperAdminCandidate = superAdminEmail === normalized;

  if (mode === "open") {
    return { allowed: true };
  }

  if (mode === "allowlist") {
    if (onAllowlist || isSuperAdminCandidate) {
      return { allowed: true };
    }
    return { allowed: false, reason: "not_on_allowlist" };
  }

  // closed — first account may bootstrap if allowlisted or matches SUPER_ADMIN_EMAIL
  if (existingUserCount === 0 && (onAllowlist || isSuperAdminCandidate)) {
    return { allowed: true };
  }

  if (onAllowlist || isSuperAdminCandidate) {
    return { allowed: true };
  }

  return { allowed: false, reason: "signup_closed" };
}

export function isRegistrationAllowed(existingUserCount: number): boolean {
  const mode = getSignupMode();
  if (mode === "open") {
    return true;
  }
  if (getSignupAllowlist().length > 0 || getSuperAdminEmail()) {
    return true;
  }
  return existingUserCount === 0 && mode === "closed";
}

export function shouldBeSuperAdmin(email: string): boolean {
  const superAdminEmail = getSuperAdminEmail();
  return Boolean(superAdminEmail && normalizeEmail(email) === superAdminEmail);
}
