import type { CalendarFilter, CalendarSourcePreferences } from '../types'

interface CalendarPresetChipsProps {
  filter: CalendarFilter
  prefs: CalendarSourcePreferences
  onChange: (filter: CalendarFilter) => void
}

export function CalendarPresetChips({ filter, prefs, onChange }: CalendarPresetChipsProps) {
  return (
    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <FilterChip
        active={filter.mode === 'merged'}
        label="All calendars"
        onClick={() => onChange({ mode: 'merged' })}
      />
      {prefs.presets.map((preset) => (
        <FilterChip
          key={preset.id}
          active={filter.mode === 'preset' && filter.presetId === preset.id}
          label={preset.label}
          onClick={() => onChange({ mode: 'preset', presetId: preset.id })}
        />
      ))}
    </div>
  )
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-caption font-semibold transition-colors ${
        active
          ? 'bg-wf-accent text-white'
          : 'bg-wf-surface text-wf-text-secondary shadow-[var(--shadow-card)]'
      }`}
    >
      {label}
    </button>
  )
}
