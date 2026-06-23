import {
  ALL_PERMISSION_KEYS,
  MOCK_HOUSEHOLD_MEMBERS,
  PERMISSION_LABELS,
  resolveMemberPermissions,
  type HouseholdPermissionsConfig,
  type PermissionKey,
} from "../../shared/householdPermissions";
import {
  clearMemberOverride,
  updateMemberDefaults,
  updateMemberOverride,
} from "../lib/householdPermissions";

interface HouseholdPermissionsViewProps {
  config: HouseholdPermissionsConfig;
  onChange: (config: HouseholdPermissionsConfig) => void;
  onBack: () => void;
}

export function HouseholdPermissionsView({
  config,
  onChange,
  onBack,
}: HouseholdPermissionsViewProps) {
  const members = MOCK_HOUSEHOLD_MEMBERS.filter((member) => member.role === "member");

  const toggleDefault = (key: PermissionKey) => {
    onChange(updateMemberDefaults(config, key, !config.memberDefaults[key]));
  };

  const toggleOverride = (memberId: string, key: PermissionKey) => {
    const member = MOCK_HOUSEHOLD_MEMBERS.find((entry) => entry.id === memberId);
    if (!member) return;

    const resolved = resolveMemberPermissions(member, config)[key];
    const override = config.memberOverrides[memberId]?.[key];

    if (override === undefined) {
      onChange(updateMemberOverride(config, memberId, key, !resolved));
      return;
    }

    const defaultValue = config.memberDefaults[key];
    if (override === defaultValue) {
      onChange(clearMemberOverride(config, memberId, key));
    } else {
      onChange(updateMemberOverride(config, memberId, key, !override));
    }
  };

  const cellValue = (memberId: string | "defaults", key: PermissionKey): boolean => {
    if (memberId === "defaults") return config.memberDefaults[key];
    const member = MOCK_HOUSEHOLD_MEMBERS.find((entry) => entry.id === memberId);
    if (!member) return false;
    return resolveMemberPermissions(member, config)[key];
  };

  const isOverride = (memberId: string, key: PermissionKey): boolean =>
    config.memberOverrides[memberId]?.[key] !== undefined;

  return (
    <div className="px-4 pb-6 pt-2 safe-top">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 text-caption font-semibold text-wf-accent"
      >
        ← Back to settings
      </button>

      <h1 className="font-display text-title font-bold text-wf-text">Household permissions</h1>
      <p className="mt-1 text-caption text-wf-text-tertiary">
        Defaults apply to all members unless overridden per person.
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-wf-surface shadow-[var(--shadow-card)]">
        <table className="min-w-full text-left text-caption">
          <thead>
            <tr className="border-b border-wf-border/60">
              <th className="px-3 py-2.5 font-semibold text-wf-text-secondary">Permission</th>
              <th className="px-3 py-2.5 font-semibold text-wf-text-secondary">Default</th>
              {members.map((member) => (
                <th key={member.id} className="px-3 py-2.5 font-semibold text-wf-text-secondary">
                  {member.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMISSION_KEYS.map((key) => (
              <tr key={key} className="border-b border-wf-border/40 last:border-0">
                <td className="px-3 py-3">
                  <p className="font-semibold text-wf-text">{PERMISSION_LABELS[key].label}</p>
                  <p className="mt-0.5 text-[11px] text-wf-text-tertiary">
                    {PERMISSION_LABELS[key].hint}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <PermissionToggle
                    checked={cellValue("defaults", key)}
                    onChange={() => toggleDefault(key)}
                  />
                </td>
                {members.map((member) => (
                  <td key={member.id} className="px-3 py-3">
                    <PermissionToggle
                      checked={cellValue(member.id, key)}
                      overridden={isOverride(member.id, key)}
                      onChange={() => toggleOverride(member.id, key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-caption text-wf-text-tertiary">
        Owners always have full access. Highlighted toggles are per-member overrides.
      </p>
    </div>
  );
}

function PermissionToggle({
  checked,
  overridden = false,
  onChange,
}: {
  checked: boolean;
  overridden?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-6 w-10 rounded-full transition-colors ${
        checked ? "bg-wf-accent" : "bg-wf-border"
      } ${overridden ? "ring-2 ring-wf-accent/40 ring-offset-1" : ""}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
