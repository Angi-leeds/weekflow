import type { TodayHighlightOptions, TodayHighlightPreset } from '../types'
import {
  DEFAULT_TODAY_HIGHLIGHT,
  TODAY_BACKGROUND_LABELS,
  TODAY_BADGE_LABELS,
  TODAY_BORDER_LABELS,
  TODAY_COLOR_SWATCHES,
  TODAY_DATE_STYLE_LABELS,
  TODAY_HIGHLIGHT_PRESET_LABELS,
  TODAY_PULSE_LABELS,
  applyTodayHighlightPreset,
} from '../types'
import {
  resolveTodayDatePresentation,
  resolveTodayHighlight,
  resolveTodayTitlePresentation,
  resolveTodayWeekdayPresentation,
} from '../lib/todayHighlight'
import { TodayHighlightBadge } from './TodayHighlightBadge'
import {
  SettingsActionRow,
  SettingsSelectRow,
  SettingsToggleRow,
} from './ui/SettingsControls'

interface TodayHighlightSettingsProps {
  options: TodayHighlightOptions
  onChange: (options: TodayHighlightOptions) => void
}

const PRESET_OPTIONS = (
  Object.keys(TODAY_HIGHLIGHT_PRESET_LABELS) as TodayHighlightPreset[]
).map((value) => ({ value, label: TODAY_HIGHLIGHT_PRESET_LABELS[value] }))

export function TodayHighlightSettingsPanel({
  options,
  onChange,
}: TodayHighlightSettingsProps) {
  const change = (patch: Partial<TodayHighlightOptions>) => {
    onChange({ ...options, ...patch, preset: 'custom' })
  }

  const applyPreset = (preset: TodayHighlightPreset) => {
    if (preset === 'custom') {
      onChange({ ...options, preset: 'custom' })
      return
    }
    onChange(applyTodayHighlightPreset(preset, options.accentColor))
  }

  const previewCardBody = resolveTodayHighlight(true, options, 'day-card')
  const previewCardHeader = resolveTodayHighlight(true, options, 'day-card-header')
  const previewColumn = resolveTodayHighlight(true, options, 'column-header')
  const previewMonth = resolveTodayHighlight(true, options, 'month-header')
  const onSolid = options.backgroundMode === 'solid'
  const title = resolveTodayTitlePresentation(true, options, onSolid)
  const weekday = resolveTodayWeekdayPresentation(true, options, 'md')
  const dateNum = resolveTodayDatePresentation(true, options, 'md', onSolid)
  const monthDate = resolveTodayDatePresentation(true, options, 'xs', onSolid)

  return (
    <>
      <p className="px-4 pb-3 pt-1 text-caption text-wf-text-tertiary">
        Every option below applies to <strong className="font-semibold text-wf-text-secondary">all calendar views</strong>{' '}
        — week list, week board, week timeline, month, day, agenda, and the Today tab.
      </p>

      <div className="mx-4 mb-4 grid gap-3 rounded-2xl border border-wf-border bg-wf-bg p-3 sm:grid-cols-3">
        <div
          className="relative overflow-hidden rounded-xl bg-wf-surface shadow-[var(--shadow-card)]"
          style={previewCardBody.style}
        >
          <div
            className={`flex items-center justify-between border-b border-wf-border px-3 py-2 ${previewCardHeader.className}`}
            style={previewCardHeader.style}
          >
            <span className={title.className} style={title.style}>
              Today
            </span>
            <TodayHighlightBadge isToday options={options} />
          </div>
          <div className="px-3 py-2 text-caption text-wf-text-tertiary">List / agenda / day</div>
        </div>

        <div
          className={`rounded-xl border border-wf-border bg-wf-surface px-2 py-2 text-center ${previewColumn.className}`}
          style={previewColumn.style}
        >
          <p className={weekday.className} style={weekday.style}>
            Wed
          </p>
          <p className={dateNum.className} style={dateNum.style}>
            18
          </p>
          <p className="mt-1 text-[10px] text-wf-text-tertiary">Week column</p>
        </div>

        <div
          className={`flex min-h-[88px] flex-col rounded-xl border border-wf-border p-2 bg-wf-surface ${previewMonth.className}`}
          style={previewMonth.style}
        >
          <span className={`${monthDate.className} self-start text-caption font-semibold`} style={monthDate.style}>
            18
          </span>
          <div className="mt-auto text-[10px] text-wf-text-tertiary">Month cell</div>
        </div>
      </div>

      <SettingsSelectRow
        label="Style preset"
        value={options.preset}
        options={PRESET_OPTIONS}
        onChange={applyPreset}
      />

      <div className="px-4 py-3">
        <p className="mb-2 text-subhead font-medium text-wf-text">Accent colour</p>
        <div className="flex flex-wrap items-center gap-2">
          {TODAY_COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Use ${color}`}
              onClick={() => change({ accentColor: color })}
              className={`h-8 w-8 rounded-full border-2 transition-transform active:scale-95 ${
                options.accentColor === color ? 'border-wf-text scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <label className="flex items-center gap-2 rounded-xl border border-wf-border bg-wf-surface px-2 py-1.5 text-caption">
            <span className="text-wf-text-secondary">Custom</span>
            <input
              type="color"
              value={options.accentColor}
              onChange={(e) => change({ accentColor: e.target.value })}
              className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent"
            />
          </label>
        </div>
      </div>

      <SettingsSelectRow
        label="Background"
        value={options.backgroundMode}
        options={(['none', 'soft', 'strong', 'solid'] as const).map((value) => ({
          value,
          label: TODAY_BACKGROUND_LABELS[value],
        }))}
        onChange={(backgroundMode) => change({ backgroundMode })}
      />

      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-subhead font-medium text-wf-text">Background strength</span>
          <span className="text-caption tabular-nums text-wf-text-secondary">
            {options.backgroundOpacity}%
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={options.backgroundOpacity}
          onChange={(e) => change({ backgroundOpacity: Number(e.target.value) })}
          className="w-full accent-[var(--color-wf-accent)]"
        />
      </div>

      <SettingsSelectRow
        label="Border"
        value={options.borderMode}
        options={(['none', 'ring', 'full', 'left-bar', 'dashed', 'double'] as const).map(
          (value) => ({ value, label: TODAY_BORDER_LABELS[value] }),
        )}
        onChange={(borderMode) => change({ borderMode })}
      />

      <SettingsSelectRow
        label="Border width"
        value={options.borderWidth}
        options={([1, 2, 3, 4] as const).map((value) => ({
          value,
          label: `${value}px`,
        }))}
        onChange={(borderWidth) => change({ borderWidth })}
      />

      <SettingsSelectRow
        label="Date number"
        value={options.dateStyle}
        options={(
          [
            'default',
            'accent-text',
            'filled-circle',
            'filled-pill',
            'outlined-circle',
            'scaled',
          ] as const
        ).map((value) => ({ value, label: TODAY_DATE_STYLE_LABELS[value] }))}
        onChange={(dateStyle) => change({ dateStyle })}
      />

      <SettingsSelectRow
        label="Pulse animation"
        value={options.pulse}
        options={(['off', 'soft', 'strong', 'glow'] as const).map((value) => ({
          value,
          label: TODAY_PULSE_LABELS[value],
        }))}
        onChange={(pulse) => change({ pulse })}
      />

      <SettingsSelectRow
        label="Today badge"
        value={options.badge}
        options={(['none', 'pill', 'dot', 'label', 'corner'] as const).map((value) => ({
          value,
          label: TODAY_BADGE_LABELS[value],
        }))}
        onChange={(badge) => change({ badge })}
      />

      <SettingsToggleRow
        label="Accent weekday label"
        description="Colour Mon, Tue, Wed… on today's column header in all views."
        checked={options.showWeekdayAccent}
        onChange={(showWeekdayAccent) => change({ showWeekdayAccent })}
      />

      <SettingsActionRow
        label="Reset today highlight"
        value="Defaults"
        onClick={() => onChange({ ...DEFAULT_TODAY_HIGHLIGHT })}
      />
    </>
  )
}
