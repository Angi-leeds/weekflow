import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type {
  CalendarFilter,
  CalendarSourcePreferences,
  CalendarViewMode,
  Category,
  EmailAccount,
  ListDisplayOptions,
  UnifiedCalendarSource,
} from '../types'
import { DEFAULT_CALENDAR_SOURCE_PREFERENCES } from '../types'
import { isToday } from '../dateUtils'
import { ListOptionsMenu } from './ui/ListOptionsMenu'
import { SegmentedControl } from './ui/SegmentedControl'
import { getPrimaryTab, ViewsMenu, type PrimaryCalendarTab } from './ui/ViewsMenu'
import { CalendarAccountFilter } from './CalendarAccountFilter'
import { CalendarPresetChips } from './CalendarPresetChips'
import { CalendarSourcesPanel } from './CalendarSourcesPanel'
import { enabledCalendarIdSet } from '../lib/calendarSources'

interface CalendarNavProps {
  viewMode: CalendarViewMode
  selectedDay: Date
  categories: Category[]
  listOptions: ListDisplayOptions
  calendarFilter: CalendarFilter
  calendarAccounts: EmailAccount[]
  calendarSources: UnifiedCalendarSource[]
  calendarSourcePrefs: CalendarSourcePreferences
  onCalendarFilterChange: (filter: CalendarFilter) => void
  onCalendarSourcePrefsChange: (prefs: CalendarSourcePreferences) => void
  onListOptionsChange: (options: ListDisplayOptions) => void
  onToday: () => void
  onViewChange: (mode: CalendarViewMode) => void
  onPrimaryTabChange: (tab: PrimaryCalendarTab) => void
  showTodoToggle?: boolean
}

const PRIMARY_SEGMENTS: { id: PrimaryCalendarTab; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'today', label: 'Today' },
  { id: 'month', label: 'Month' },
]

export function CalendarNav({
  viewMode,
  selectedDay,
  categories,
  listOptions,
  calendarFilter,
  calendarAccounts,
  calendarSources = [],
  calendarSourcePrefs = DEFAULT_CALENDAR_SOURCE_PREFERENCES,
  onCalendarFilterChange,
  onCalendarSourcePrefsChange = () => {},
  onListOptionsChange,
  onToday,
  onViewChange,
  onPrimaryTabChange,
  showTodoToggle = true,
}: CalendarNavProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const isWeekBased = ['week-list', 'week-board', 'week-timeline'].includes(viewMode)
  const primaryTab = getPrimaryTab(viewMode, isToday(selectedDay)) ?? 'week'
  const useMultiCalendarUi = calendarSources.length > 0
  const enabledCount = enabledCalendarIdSet(calendarSourcePrefs, calendarSources).size

  const title =
    viewMode === 'month' || isWeekBased
      ? 'Calendar'
      : viewMode === 'day'
        ? selectedDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'Calendar'

  return (
    <div className="sticky top-0 z-20 border-b border-wf-border bg-wf-bg/90 px-4 pb-3 pt-2 backdrop-blur-xl safe-top">
      <div className="mb-3 flex items-center gap-2">
        <div className="w-[72px]" />

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-body font-bold tracking-tight text-wf-text">
            {title}
          </p>
          {(isWeekBased || viewMode === 'month') && (
            <p className="mt-0.5 truncate text-[11px] text-wf-text-secondary">
              Selected{' '}
              <span className="font-semibold text-wf-accent">
                {selectedDay.toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              {!isToday(selectedDay) && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={onToday}
                    className="font-semibold text-wf-accent underline-offset-2 hover:underline"
                  >
                    Today
                  </button>
                </>
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onToday}
          className="shrink-0 rounded-full bg-wf-accent-soft px-3 py-1.5 text-subhead font-semibold text-wf-accent transition-transform active:scale-95"
        >
          Today
        </button>
      </div>

      <div className="flex items-center gap-2">
        <SegmentedControl
          segments={PRIMARY_SEGMENTS}
          active={primaryTab}
          onChange={onPrimaryTabChange}
          className="min-w-0 flex-1"
        />
        <ListOptionsMenu categories={categories} options={listOptions} onChange={onListOptionsChange} />
        <ViewsMenu viewMode={viewMode} onViewChange={onViewChange} />
      </div>

      {useMultiCalendarUi ? (
        <div className="mt-2 flex items-start gap-2">
          <button
            type="button"
            onClick={() => setSourcesOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-wf-surface px-3 py-1 text-caption font-semibold text-wf-text-secondary shadow-[var(--shadow-card)]"
            aria-expanded={sourcesOpen}
          >
            <CalendarDays size={14} />
            Calendars
            <span className="rounded-full bg-wf-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-wf-accent">
              {enabledCount}
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <CalendarPresetChips
              filter={calendarFilter}
              prefs={calendarSourcePrefs}
              onChange={onCalendarFilterChange}
            />
          </div>
        </div>
      ) : (
        calendarAccounts.length > 0 && (
          <CalendarAccountFilter
            filter={calendarFilter}
            accounts={calendarAccounts}
            onChange={onCalendarFilterChange}
          />
        )
      )}

      <CalendarSourcesPanel
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        sources={calendarSources}
        prefs={calendarSourcePrefs}
        onChange={onCalendarSourcePrefsChange}
        showTodoToggle={showTodoToggle}
      />
    </div>
  )
}
