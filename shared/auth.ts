export type SignupMode = "closed" | "allowlist" | "open";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean;
  totpEnabled?: boolean;
  createdAt: string;
}

export interface AuthConfig {
  enabled: boolean;
  signupMode: SignupMode;
  registrationAllowed: boolean;
  passwordResetEnabled: boolean;
  invitesEnabled: boolean;
}

export interface InvitePreview {
  email: string;
  displayName?: string;
  valid: boolean;
}

export interface ResetTokenPreview {
  valid: boolean;
  email?: string;
}

export interface TotpSetupPayload {
  secret: string;
  otpauthUrl: string;
}

export interface LoginResult {
  user?: AuthUser;
  requiresTotp?: boolean;
  challengeToken?: string;
}

export interface HouseholdInviteRow {
  id: string;
  email: string;
  token: string;
  displayName?: string;
  inviteUrl: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface SuperAdminOverview {
  signupMode: SignupMode;
  allowlistCount: number;
  userCount: number;
  superAdminEmailConfigured: boolean;
  authEnabled: boolean;
}

export interface SuperAdminUserRow {
  id: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean;
  createdAt: string;
}
