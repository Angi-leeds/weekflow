import {
  DEFAULT_MEMBER_PERMISSIONS,
  MOCK_HOUSEHOLD_MEMBERS,
  type HouseholdMember,
  type HouseholdPermissionsConfig,
  type PermissionKey,
  type PermissionSet,
} from "../../shared/householdPermissions";

const STORAGE_KEY = "weekflow-household-permissions";

export function defaultPermissionsConfig(): HouseholdPermissionsConfig {
  return {
    memberDefaults: { ...DEFAULT_MEMBER_PERMISSIONS },
    memberOverrides: {},
    activeMemberId: MOCK_HOUSEHOLD_MEMBERS[0].id,
  };
}

export function loadHouseholdPermissions(): HouseholdPermissionsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPermissionsConfig();
    const parsed = JSON.parse(raw) as HouseholdPermissionsConfig;
    return {
      ...defaultPermissionsConfig(),
      ...parsed,
      memberDefaults: {
        ...DEFAULT_MEMBER_PERMISSIONS,
        ...parsed.memberDefaults,
      },
    };
  } catch {
    return defaultPermissionsConfig();
  }
}

export function saveHouseholdPermissions(config: HouseholdPermissionsConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getActiveMember(config: HouseholdPermissionsConfig): HouseholdMember {
  return (
    MOCK_HOUSEHOLD_MEMBERS.find((member) => member.id === config.activeMemberId) ??
    MOCK_HOUSEHOLD_MEMBERS[0]
  );
}

export function updateMemberDefaults(
  config: HouseholdPermissionsConfig,
  key: PermissionKey,
  value: boolean,
): HouseholdPermissionsConfig {
  return {
    ...config,
    memberDefaults: { ...config.memberDefaults, [key]: value },
  };
}

export function updateMemberOverride(
  config: HouseholdPermissionsConfig,
  memberId: string,
  key: PermissionKey,
  value: boolean,
): HouseholdPermissionsConfig {
  const current = config.memberOverrides[memberId] ?? {};
  return {
    ...config,
    memberOverrides: {
      ...config.memberOverrides,
      [memberId]: { ...current, [key]: value },
    },
  };
}

export function clearMemberOverride(
  config: HouseholdPermissionsConfig,
  memberId: string,
  key: PermissionKey,
): HouseholdPermissionsConfig {
  const current = { ...(config.memberOverrides[memberId] ?? {}) };
  delete current[key];
  const nextOverrides = { ...config.memberOverrides };
  if (Object.keys(current).length === 0) {
    delete nextOverrides[memberId];
  } else {
    nextOverrides[memberId] = current;
  }
  return { ...config, memberOverrides: nextOverrides };
}

export function setActiveMemberId(
  config: HouseholdPermissionsConfig,
  memberId: string,
): HouseholdPermissionsConfig {
  return { ...config, activeMemberId: memberId };
}

export type { HouseholdMember, HouseholdPermissionsConfig, PermissionKey, PermissionSet };
