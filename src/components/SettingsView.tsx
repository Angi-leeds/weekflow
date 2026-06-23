import { useMemo, useRef, useState } from 'react'
import type {
  CalendarItem,
  CalendarPreferences,
  Category,
  EmailAccount,
  IntegrationPreferences,
  ListDisplayOptions,
  ListGroupBy,
  ListSortBy,
  WeekStartsOn,
} from '../types'
import {
  DEFAULT_VIEW_LABELS,
  LIST_GROUP_LABELS,
  LIST_SORT_LABELS,
  SETTINGS_DEFAULT_VIEWS,
  TIME_FORMAT_LABELS,
  WEEK_START_LABELS,
} from '../types'
import { MOCK_HOUSEHOLD_MEMBERS } from '../../shared/householdPermissions'
import type { HouseholdPermissionsConfig } from '../lib/householdPermissions'
import type { MicrosoftIntegrationStatus } from '../../shared/microsoftGraph'
import { loadKioskPin, saveKioskPin } from './KioskPinGate'
import { SyncHelpView } from './SyncHelpView'
import { HouseholdPermissionsView } from './HouseholdPermissionsView'
import { MicrosoftConnectPanel } from './MicrosoftConnectPanel'
import { CategoriesManager } from './CategoriesManager'
import { ListOptionsMenu } from './ui/ListOptionsMenu'
import { SectionHeader } from './ui/SectionHeader'
import {
  SettingsActionRow,
  SettingsCategoryFilterRow,
  SettingsIntegrationRow,
  SettingsSelectRow,
  SettingsToggleRow,
} from './ui/SettingsControls'

interface SettingsViewProps {
  categories: Category[]
  items: CalendarItem[]
  listOptions: ListDisplayOptions
  onListOptionsChange: (options: ListDisplayOptions) => void
  calendarPreferences: CalendarPreferences
  onCalendarPreferencesChange: (prefs: CalendarPreferences) => void
  integrationPreferences: IntegrationPreferences
  onIntegrationPreferencesChange: (prefs: IntegrationPreferences) => void
  onSaveCategory: (category: Category) => void
  onDeleteCategory: (id: string) => void
  permissionsConfig: HouseholdPermissionsConfig
  onPermissionsChange: (config: HouseholdPermissionsConfig) => void
  microsoftStatus: MicrosoftIntegrationStatus | null
  microsoftLoading: boolean
  onMicrosoftRefresh: () => void
  emailAccounts: EmailAccount[]
  calendarAccounts: EmailAccount[]
  usingRealMicrosoft: boolean
  onShowCalendarAccount: (accountId: string) => void
  onShowToast?: (message: string) => void
  onOpenBoard?: () => void
  onEnterKiosk?: () => void
  sharedBoardCount?: number
}

const GROUP_OPTIONS: ListGroupBy[] = ['none', 'category', 'time', 'kind']
const SORT_OPTIONS: ListSortBy[] = ['time', 'alpha']

export function SettingsView({
  categories,
  items,
  listOptions,
  onListOptionsChange,
  calendarPreferences,
  onCalendarPreferencesChange,
  integrationPreferences,
  onIntegrationPreferencesChange,
  onSaveCategory,
  onDeleteCategory,
  permissionsConfig,
  onPermissionsChange,
  microsoftStatus,
  microsoftLoading,
  onMicrosoftRefresh,
  emailAccounts,
  calendarAccounts,
  usingRealMicrosoft,
  onShowCalendarAccount,
  onShowToast,
  onOpenBoard,
  onEnterKiosk,
  sharedBoardCount = 0,
}: SettingsViewProps) {
  const [kioskPin, setKioskPin] = useState(() => loadKioskPin())
  const [showSyncHelp, setShowSyncHelp] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const outlookPanelRef = useRef<HTMLDivElement>(null)

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1
    }
    return counts
  }, [items])

  const scrollToOutlook = () => {
    outlookPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const showPhase10Toast = (name: string) => {
    onShowToast?.(`${name} is planned for Phase 10`)
  }

  if (showSyncHelp) {
    return <SyncHelpView onBack={() => setShowSyncHelp(false)} />
  }

  if (showPermissions) {
    return (
      <HouseholdPermissionsView
        config={permissionsConfig}
        onChange={onPermissionsChange}
        onBack={() => setShowPermissions(false)}
      />
    )
  }

  return (
    <div className="px-4 pb-6 pt-2 safe-top">
      <div className="mb-4 flex items-start justify-between gap-2">
        <SectionHeader title="Settings" />
        <ListOptionsMenu
          categories={categories}
          options={listOptions}
          onChange={onListOptionsChange}
        />
      </div>

      <SettingsGroup title="Categories">
        <p className="px-4 pb-3 pt-1 text-caption text-wf-text-tertiary">
          Customise colours and labels. Items inherit their category colour.
        </p>
        <div className="px-4 pb-4">
          <CategoriesManager
            categories={categories}
            itemCounts={itemCounts}
            onSave={onSaveCategory}
            onDelete={onDeleteCategory}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup title="List display">
        <SettingsSelectRow
          label="Group by"
          value={listOptions.groupBy}
          options={GROUP_OPTIONS.map((key) => ({ value: key, label: LIST_GROUP_LABELS[key] }))}
          onChange={(groupBy) => onListOptionsChange({ ...listOptions, groupBy })}
        />
        <SettingsSelectRow
          label="Sort"
          value={listOptions.sortBy}
          options={SORT_OPTIONS.map((key) => ({ value: key, label: LIST_SORT_LABELS[key] }))}
          onChange={(sortBy) => onListOptionsChange({ ...listOptions, sortBy })}
        />
        <SettingsCategoryFilterRow
          categories={categories}
          categoryFilter={listOptions.categoryFilter}
          onChange={(categoryFilter) => onListOptionsChange({ ...listOptions, categoryFilter })}
        />
        <SettingsToggleRow
          label="Hide completed"
          checked={listOptions.hideCompleted}
          onChange={(hideCompleted) => onListOptionsChange({ ...listOptions, hideCompleted })}
        />
      </SettingsGroup>

      <SettingsGroup title="Calendar">
        <SettingsSelectRow
          label="Default view"
          value={calendarPreferences.defaultView}
          options={SETTINGS_DEFAULT_VIEWS.map((mode) => ({
            value: mode,
            label: DEFAULT_VIEW_LABELS[mode],
          }))}
          onChange={(defaultView) =>
            onCalendarPreferencesChange({ ...calendarPreferences, defaultView })
          }
        />
        <SettingsSelectRow
          label="Week starts on"
          value={calendarPreferences.weekStartsOn}
          options={([0, 1] as WeekStartsOn[]).map((value) => ({
            value,
            label: WEEK_START_LABELS[value],
          }))}
          onChange={(weekStartsOn) =>
            onCalendarPreferencesChange({ ...calendarPreferences, weekStartsOn })
          }
        />
        <SettingsSelectRow
          label="Time format"
          value={calendarPreferences.timeFormat}
          options={(['24h', '12h'] as const).map((value) => ({
            value,
            label: TIME_FORMAT_LABELS[value],
          }))}
          onChange={(timeFormat) =>
            onCalendarPreferencesChange({ ...calendarPreferences, timeFormat })
          }
        />
        <p className="px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
          {usingRealMicrosoft
            ? 'Tap a calendar to filter the week view to that account.'
            : 'Demo calendars — tap to preview the account filter.'}
        </p>
        {calendarAccounts.map((account) => (
          <SettingsActionRow
            key={account.id}
            label={account.label}
            value={usingRealMicrosoft ? account.email : 'Demo · tap to filter'}
            onClick={() => onShowCalendarAccount(account.id)}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title="Household">
        <p className="px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
          Prototype profile — permissions apply to the signed-in household member.
        </p>
        <div className="border-b border-wf-border/50 px-4 py-3.5">
          <label className="block">
            <span className="text-body font-medium text-wf-text">Signed in as</span>
            <select
              value={permissionsConfig.activeMemberId}
              onChange={(event) =>
                onPermissionsChange({
                  ...permissionsConfig,
                  activeMemberId: event.target.value,
                })
              }
              className="mt-2 w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body outline-none focus:border-wf-accent"
            >
              {MOCK_HOUSEHOLD_MEMBERS.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName} ({member.role})
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => setShowPermissions(true)}
          className="mx-4 mb-4 mt-2 w-[calc(100%-2rem)] rounded-xl bg-wf-accent-soft py-2.5 text-body font-semibold text-wf-accent"
        >
          Household permissions
        </button>
      </SettingsGroup>

      <SettingsGroup title="Family board">
        <p className="px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
          Corky-style noticeboard for shared household items. Share events from the item editor or email view.
        </p>
        {onOpenBoard && (
          <button
            type="button"
            onClick={onOpenBoard}
            className="mx-4 mb-3 w-[calc(100%-2rem)] rounded-xl bg-wf-accent-soft py-2.5 text-body font-semibold text-wf-accent"
          >
            Open family board
          </button>
        )}
        <SettingsRow label="Shared on board" value={String(sharedBoardCount)} />
        <div className="border-b border-wf-border/50 px-4 py-3.5">
          <label className="block">
            <span className="text-body font-medium text-wf-text">Kiosk exit PIN</span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={kioskPin}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, '').slice(0, 4)
                setKioskPin(next)
                if (next.length === 4) saveKioskPin(next)
              }}
              className="mt-2 w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body tracking-[0.3em] outline-none focus:border-wf-accent"
            />
          </label>
          <p className="mt-1.5 text-caption text-wf-text-tertiary">
            Required to leave fullscreen kiosk mode on the family board.
          </p>
        </div>
        {onEnterKiosk && (
          <button
            type="button"
            onClick={onEnterKiosk}
            className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-xl border border-wf-border py-2.5 text-body font-semibold text-wf-text-secondary"
          >
            Enter kiosk mode
          </button>
        )}
      </SettingsGroup>

      <SettingsGroup title="Data &amp; sync">
        <p className="px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
          What stays in Gmail/Outlook vs what WeekFlow stores.
        </p>
        <button
          type="button"
          onClick={() => setShowSyncHelp(true)}
          className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-xl bg-wf-accent-soft py-2.5 text-body font-semibold text-wf-accent"
        >
          View sync matrix
        </button>
      </SettingsGroup>

      <SettingsGroup title="Email">
        <div ref={outlookPanelRef}>
          <MicrosoftConnectPanel
            status={microsoftStatus}
            loading={microsoftLoading}
            onRefresh={onMicrosoftRefresh}
          />
        </div>

        {!usingRealMicrosoft && !microsoftStatus?.configured && (
          <>
            <p className="border-t border-wf-border/50 px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
              Demo inboxes — tap to jump to Outlook setup above.
            </p>
            {emailAccounts.map((account) => (
              <SettingsActionRow
                key={account.id}
                label={account.label}
                value={`${account.email} · Demo`}
                onClick={scrollToOutlook}
              />
            ))}
          </>
        )}

        <SettingsIntegrationRow
          label="Gmail"
          description="Google mail and calendar sync."
          phaseLabel="Phase 10"
          notifyChecked={integrationPreferences.googleInterest}
          onNotifyChange={(googleInterest) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, googleInterest })
          }
          onConnect={() => showPhase10Toast('Gmail')}
        />
        <SettingsIntegrationRow
          label="Apple Mail"
          description="iCloud mail with hyperlink fallbacks where APIs are limited."
          phaseLabel="Phase 10"
          notifyChecked={integrationPreferences.appleInterest}
          onNotifyChange={(appleInterest) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, appleInterest })
          }
          onConnect={() => showPhase10Toast('Apple Mail')}
        />
      </SettingsGroup>

      <SettingsGroup title="Integrations">
        <p className="px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
          Outlook sticky notes sync when connected (Notes tab). Contacts import is a future Graph update.
        </p>
        <SettingsIntegrationRow
          label="Google Calendar"
          description="Sync events from Google Calendar accounts."
          phaseLabel="Phase 10"
          notifyChecked={integrationPreferences.googleInterest}
          onNotifyChange={(googleInterest) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, googleInterest })
          }
          onConnect={() => showPhase10Toast('Google Calendar')}
        />
        <SettingsIntegrationRow
          label="Apple Calendar"
          description="Subscribe to iCloud calendars where supported."
          phaseLabel="Phase 10"
          notifyChecked={integrationPreferences.appleInterest}
          onNotifyChange={(appleInterest) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, appleInterest })
          }
          onConnect={() => showPhase10Toast('Apple Calendar')}
        />
        <SettingsIntegrationRow
          label="Apple Notes"
          description="No public iCloud Notes API — device export or deep links in Phase 10."
          phaseLabel="Phase 10"
          notifyChecked={integrationPreferences.appleInterest}
          onNotifyChange={(appleInterest) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, appleInterest })
          }
          onConnect={() => showPhase10Toast('Apple Notes')}
        />
        <SettingsToggleRow
          label="Push notifications"
          description="Reminders and household updates (Phase 10)."
          checked={integrationPreferences.notificationsEnabled}
          onChange={(notificationsEnabled) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, notificationsEnabled })
          }
        />
      </SettingsGroup>

      <SettingsGroup title="About">
        <SettingsRow label="Version" value="0.1.0 prototype" />
        <SettingsRow label="App" value="WeekFlow" />
      </SettingsGroup>
    </div>
  )
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 px-3 text-subhead font-semibold text-wf-text-secondary">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl bg-wf-surface shadow-[var(--shadow-card)]">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-b border-wf-border/50 px-4 py-3.5 last:border-0">
      <span className="text-body font-medium text-wf-text">{label}</span>
      <span className={`text-body ${muted ? 'text-wf-text-tertiary' : 'text-wf-text-secondary'}`}>
        {value}
      </span>
    </div>
  )
}
