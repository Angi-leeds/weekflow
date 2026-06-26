import type { CalendarSourcePreferences, UnifiedCalendarSource } from '../types'

interface CalendarPresetSettingsPanelProps {
  sources: UnifiedCalendarSource[]
  prefs: CalendarSourcePreferences
  onChange: (prefs: CalendarSourcePreferences) => void
}

export function CalendarPresetSettingsPanel({
  sources,
  prefs,
  onChange,
}: CalendarPresetSettingsPanelProps) {
  if (sources.length === 0) return null

  const togglePresetMembership = (presetId: string, sourceId: string, checked: boolean) => {
    onChange({
      ...prefs,
      presets: prefs.presets.map((preset) => {
        if (preset.id !== presetId) return preset
        const ids = new Set(preset.calendarIds)
        if (checked) ids.add(sourceId)
        else ids.delete(sourceId)
        return { ...preset, calendarIds: [...ids] }
      }),
    })
  }

  return (
    <div className="space-y-4 px-4 pb-2">
      <p className="text-caption text-wf-text-tertiary">
        Choose which calendars appear when you tap Work set or Personal set on the calendar view.
      </p>
      {prefs.presets.map((preset) => (
        <div key={preset.id}>
          <p className="mb-2 text-subhead font-semibold text-wf-text">{preset.label}</p>
          <div className="space-y-1">
            {sources.map((source) => {
              const checked = preset.calendarIds.includes(source.id)
              return (
                <label
                  key={`${preset.id}-${source.id}`}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-wf-surface/80"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      togglePresetMembership(preset.id, source.id, event.target.checked)
                    }
                    className="h-4 w-4 rounded border-wf-border text-wf-accent focus:ring-wf-accent"
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: source.colour ?? '#8E8E93' }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-subhead text-wf-text">
                    {source.name}
                  </span>
                  {source.accountLabel && (
                    <span className="shrink-0 text-[11px] text-wf-text-tertiary">
                      {source.accountLabel}
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
