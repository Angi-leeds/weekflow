import { MOCK_CALENDAR_ACCOUNTS } from "../mockData";
import type { CalendarFilter } from "../types";

interface CalendarAccountFilterProps {
  filter: CalendarFilter;
  onChange: (filter: CalendarFilter) => void;
  showAccountBadge?: boolean;
}

export function CalendarAccountFilter({ filter, onChange }: CalendarAccountFilterProps) {
  return (
    <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <FilterChip
        active={filter.mode === "merged"}
        label="All calendars"
        onClick={() => onChange({ mode: "merged" })}
      />
      {MOCK_CALENDAR_ACCOUNTS.map((account) => (
        <FilterChip
          key={account.id}
          active={filter.mode === "account" && filter.accountId === account.id}
          label={account.label}
          colour={account.colour}
          onClick={() => onChange({ mode: "account", accountId: account.id })}
        />
      ))}
    </div>
  );
}

function FilterChip({
  active,
  label,
  colour,
  onClick,
}: {
  active: boolean;
  label: string;
  colour?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold transition-colors ${
        active
          ? "bg-wf-accent text-white"
          : "bg-wf-surface text-wf-text-secondary shadow-[var(--shadow-card)]"
      }`}
    >
      {colour && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: active ? "white" : colour }}
          aria-hidden
        />
      )}
      {label}
    </button>
  );
}

export function calendarFilterMatchesItem(filter: CalendarFilter, accountId: string): boolean {
  if (filter.mode === "merged") return true;
  return filter.accountId === accountId;
}
