export type PermissionKey =
  | "shareToBoard"
  | "dismissVoicePins"
  | "manageBoardLayout"
  | "editHouseholdSettings"
  | "viewAllCalendars";

export type PermissionSet = Record<PermissionKey, boolean>;

export const PERMISSION_LABELS: Record<PermissionKey, { label: string; hint: string }> = {
  shareToBoard: {
    label: "Share to board",
    hint: "Opt items in to the family board",
  },
  dismissVoicePins: {
    label: "Dismiss voice pins",
    hint: "Remove voice notes from the board",
  },
  manageBoardLayout: {
    label: "Manage board layout",
    hint: "Switch kanban, sleep mode, pin styles",
  },
  editHouseholdSettings: {
    label: "Edit household settings",
    hint: "Change permissions and invites",
  },
  viewAllCalendars: {
    label: "View all calendars",
    hint: "See every connected calendar account",
  },
};

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as PermissionKey[];

export const OWNER_PERMISSIONS: PermissionSet = {
  shareToBoard: true,
  dismissVoicePins: true,
  manageBoardLayout: true,
  editHouseholdSettings: true,
  viewAllCalendars: true,
};

export const DEFAULT_MEMBER_PERMISSIONS: PermissionSet = {
  shareToBoard: true,
  dismissVoicePins: false,
  manageBoardLayout: false,
  editHouseholdSettings: false,
  viewAllCalendars: true,
};

export type HouseholdRole = "owner" | "member";

export interface HouseholdMember {
  id: string;
  displayName: string;
  role: HouseholdRole;
}

export const MOCK_HOUSEHOLD_MEMBERS: HouseholdMember[] = [
  { id: "member-mum", displayName: "Mum", role: "owner" },
  { id: "member-dad", displayName: "Dad", role: "member" },
  { id: "member-kids", displayName: "Kids", role: "member" },
];

export interface HouseholdPermissionsConfig {
  memberDefaults: PermissionSet;
  memberOverrides: Record<string, Partial<PermissionSet>>;
  activeMemberId: string;
}

export function resolveMemberPermissions(
  member: HouseholdMember,
  config: HouseholdPermissionsConfig,
): PermissionSet {
  if (member.role === "owner") return { ...OWNER_PERMISSIONS };

  const base = { ...config.memberDefaults };
  const overrides = config.memberOverrides[member.id] ?? {};
  for (const key of ALL_PERMISSION_KEYS) {
    if (overrides[key] !== undefined) {
      base[key] = overrides[key]!;
    }
  }
  return base;
}

export function memberCan(
  member: HouseholdMember,
  config: HouseholdPermissionsConfig,
  key: PermissionKey,
): boolean {
  return resolveMemberPermissions(member, config)[key];
}
