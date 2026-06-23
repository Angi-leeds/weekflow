export type SignupMode = "closed" | "allowlist" | "open";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface AuthConfig {
  enabled: boolean;
  signupMode: SignupMode;
  registrationAllowed: boolean;
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
