import { ChevronRight } from "lucide-react";

interface SettingsSelectRowProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function SettingsSelectRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: SettingsSelectRowProps<T>) {
  return (
    <label className="flex items-center justify-between gap-3 border-b border-wf-border/50 px-4 py-3.5 last:border-0">
      <span className="text-body font-medium text-wf-text">{label}</span>
      <select
        value={String(value)}
        onChange={(event) => {
          const raw = event.target.value;
          const match = options.find((option) => String(option.value) === raw);
          if (match) onChange(match.value);
        }}
        className="max-w-[52%] truncate rounded-lg border border-wf-border bg-wf-bg px-2.5 py-1.5 text-body text-wf-text-secondary outline-none focus:border-wf-accent"
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface SettingsToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: SettingsToggleRowProps) {
  return (
    <label
      className={`flex items-center justify-between gap-3 border-b border-wf-border/50 px-4 py-3.5 last:border-0 ${
        disabled ? "opacity-50" : "cursor-pointer"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-wf-text">{label}</span>
        {description && (
          <span className="mt-0.5 block text-caption text-wf-text-tertiary">{description}</span>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 rounded accent-wf-accent"
      />
    </label>
  );
}

interface SettingsActionRowProps {
  label: string;
  value: string;
  onClick: () => void;
  muted?: boolean;
}

export function SettingsActionRow({ label, value, onClick, muted = false }: SettingsActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 border-b border-wf-border/50 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-black/[0.02] active:bg-black/[0.04]"
    >
      <span className="text-body font-medium text-wf-text">{label}</span>
      <span className="flex shrink-0 items-center gap-1">
        <span className={`text-body ${muted ? "text-wf-text-tertiary" : "text-wf-text-secondary"}`}>
          {value}
        </span>
        <ChevronRight size={16} className="text-wf-text-tertiary" strokeWidth={2} />
      </span>
    </button>
  );
}

interface SettingsCategoryFilterRowProps {
  categories: { id: string; name: string; colour: string }[];
  categoryFilter: string[] | null;
  onChange: (categoryFilter: string[] | null) => void;
}

export function SettingsCategoryFilterRow({
  categories,
  categoryFilter,
  onChange,
}: SettingsCategoryFilterRowProps) {
  const allIds = categories.map((category) => category.id);
  const summary =
    !categoryFilter || categoryFilter.length === allIds.length
      ? "All"
      : `${categoryFilter.length} selected`;

  const toggleCategory = (id: string) => {
    const current = categoryFilter ?? [...allIds];
    const has = current.includes(id);
    let next: string[] | null;
    if (has) {
      next = current.filter((entry) => entry !== id);
      if (next.length === 0 || next.length === allIds.length) next = null;
    } else {
      next = [...current, id];
      if (next.length === allIds.length) next = null;
    }
    onChange(next);
  };

  const isActive = (id: string) => !categoryFilter || categoryFilter.includes(id);

  return (
    <div className="border-b border-wf-border/50 px-4 py-3.5 last:border-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-body font-medium text-wf-text">Categories shown</span>
        <span className="text-body text-wf-text-secondary">{summary}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const active = isActive(category.id);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleCategory(category.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold transition-colors ${
                active
                  ? "bg-wf-accent text-white"
                  : "bg-wf-bg text-wf-text-secondary ring-1 ring-wf-border"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: active ? "white" : category.colour }}
                aria-hidden
              />
              {category.name}
            </button>
          );
        })}
      </div>
      {categoryFilter && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-caption font-medium text-wf-accent"
        >
          Show all categories
        </button>
      )}
    </div>
  );
}

interface SettingsIntegrationRowProps {
  label: string;
  description: string;
  phaseLabel: string;
  notifyChecked: boolean;
  onNotifyChange: (checked: boolean) => void;
  onConnect?: () => void;
}

export function SettingsIntegrationRow({
  label,
  description,
  phaseLabel,
  notifyChecked,
  onNotifyChange,
  onConnect,
}: SettingsIntegrationRowProps) {
  return (
    <div className="border-b border-wf-border/50 px-4 py-3.5 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-wf-text">{label}</p>
          <p className="mt-0.5 text-caption text-wf-text-tertiary">{description}</p>
        </div>
        <button
          type="button"
          disabled={!onConnect}
          onClick={onConnect}
          className="shrink-0 rounded-lg border border-wf-border px-3 py-1.5 text-caption font-semibold text-wf-text-tertiary"
        >
          {phaseLabel}
        </button>
      </div>
      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
        <span className="text-caption text-wf-text-secondary">Notify me when available</span>
        <input
          type="checkbox"
          checked={notifyChecked}
          onChange={(event) => onNotifyChange(event.target.checked)}
          className="h-4 w-4 rounded accent-wf-accent"
        />
      </label>
    </div>
  );
}
