import { useMemo, useState } from 'react'
import type { CalendarItem, Category, ListDisplayOptions } from '../types'
import { LIST_GROUP_LABELS, LIST_SORT_LABELS } from '../types'
import { MOCK_CALENDAR_ACCOUNTS, MOCK_EMAIL_ACCOUNTS } from '../mockData'
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

interface SettingsViewProps {
  categories: Category[]
  items: CalendarItem[]
  listOptions: ListDisplayOptions
  onListOptionsChange: (options: ListDisplayOptions) => void
  onSaveCategory: (category: Category) => void
  onDeleteCategory: (id: string) => void
  permissionsConfig: HouseholdPermissionsConfig
  onPermissionsChange: (config: HouseholdPermissionsConfig) => void
  microsoftStatus: MicrosoftIntegrationStatus | null
  microsoftLoading: boolean
  onMicrosoftRefresh: () => void
  onOpenBoard?: () => void
  onEnterKiosk?: () => void
  sharedBoardCount?: number
}

export function SettingsView({
  categories,
  items,
  listOptions,
  onListOptionsChange,
  onSaveCategory,
  onDeleteCategory,
  permissionsConfig,
  onPermissionsChange,
  microsoftStatus,
  microsoftLoading,
  onMicrosoftRefresh,
  onOpenBoard,
  onEnterKiosk,
  sharedBoardCount = 0,
}: SettingsViewProps) {
  const [kioskPin, setKioskPin] = useState(() => loadKioskPin())
  const [showSyncHelp, setShowSyncHelp] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const categorySummary =
    listOptions.categoryFilter && listOptions.categoryFilter.length > 0
      ? `${listOptions.categoryFilter.length} selected`
      : 'All'

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1
    }
    return counts
  }, [items])

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
        <SettingsRow label="Group by" value={LIST_GROUP_LABELS[listOptions.groupBy]} />
        <SettingsRow label="Sort" value={LIST_SORT_LABELS[listOptions.sortBy]} />
        <SettingsRow label="Categories shown" value={categorySummary} />
        <SettingsRow label="Hide completed" value={listOptions.hideCompleted ? 'On' : 'Off'} />
      </SettingsGroup>

      <SettingsGroup title="Calendar">
        <SettingsRow label="Default view" value="Week list" />
        <SettingsRow label="Week starts on" value="Monday" />
        <SettingsRow label="Time format" value="24 hour" />
        <p className="px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
          Mock connected calendars — filter by account in week view.
        </p>
        {MOCK_CALENDAR_ACCOUNTS.map((account) => (
          <div
            key={account.id}
            className="flex items-center gap-3 border-b border-wf-border/50 px-4 py-3.5 last:border-0"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: account.colour }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-wf-text">{account.label}</p>
              <p className="truncate text-caption text-wf-text-tertiary">{account.email}</p>
            </div>
            <span className="shrink-0 text-caption font-medium text-wf-green">Connected</span>
          </div>
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
        <MicrosoftConnectPanel
          status={microsoftStatus}
          loading={microsoftLoading}
          onRefresh={onMicrosoftRefresh}
        />
        <p className="px-4 pb-2 pt-1 text-caption text-wf-text-tertiary">
          Mock accounts remain for demo. Connected Outlook mail merges into the inbox.
        </p>
        {MOCK_EMAIL_ACCOUNTS.map((account) => (
          <div
            key={account.id}
            className="flex items-center gap-3 border-b border-wf-border/50 px-4 py-3.5 last:border-0"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: account.colour }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-wf-text">{account.label}</p>
              <p className="truncate text-caption text-wf-text-tertiary">{account.email}</p>
            </div>
            <span className="shrink-0 text-caption font-medium text-wf-green">Connected</span>
          </div>
        ))}
        <SettingsRow label="Gmail (add account)" value="Phase 10" muted />
        <SettingsRow label="Apple Mail" value="Phase 10" muted />
      </SettingsGroup>

      <SettingsGroup title="Integrations">
        <SettingsRow label="Apple Calendar" value="Coming soon" muted />
        <SettingsRow label="Google Calendar" value="Coming soon" muted />
        <SettingsRow label="Notifications" value="Coming soon" muted />
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
