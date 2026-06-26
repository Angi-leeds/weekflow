import { useMemo, useRef, useState } from 'react'
import type {
  CalendarItem,
  CalendarPreferences,
  Category,
  EmailAccount,
  IntegrationAccountDefaults,
  IntegrationPreferences,
  ItemCardDensity,
  ItemColorStyle,
  ItemDisplayOptions,
  ItemDisplayPreset,
  ItemTimePlacement,
  ItemTitleSize,
  ListDisplayOptions,
  ListGroupBy,
  ListSortBy,
  MultiDayAllDayLayout,
  WeekStartsOn,
} from '../types'
import {
  DEFAULT_ITEM_DISPLAY,
  DEFAULT_VIEW_LABELS,
  ITEM_COLOR_STYLE_LABELS,
  ITEM_DENSITY_LABELS,
  ITEM_DISPLAY_PRESET_LABELS,
  ITEM_TIME_PLACEMENT_LABELS,
  ITEM_TITLE_SIZE_LABELS,
  LIST_GROUP_LABELS,
  LIST_SORT_LABELS,
  MULTI_DAY_ALL_DAY_LAYOUT_LABELS,
  SETTINGS_DEFAULT_VIEWS,
  TIME_FORMAT_LABELS,
  WEEK_START_LABELS,
  applyItemDisplayPreset,
} from '../types'
import type { AuthUser } from '../../shared/auth'
import { APP_NAME } from '../branding'
import { addDays, getWeekDays, getWeekSpanSegments, startOfWeek, toISODate } from '../dateUtils'
import { MOCK_HOUSEHOLD_MEMBERS } from '../../shared/householdPermissions'
import type { HouseholdPermissionsConfig } from '../lib/householdPermissions'
import type {
  GraphCalendarDto,
  GraphTodoListDto,
  MicrosoftIntegrationStatus,
} from '../../shared/microsoftGraph'
import type { GoogleCalendarDto, GoogleIntegrationStatus } from '../../shared/googleApi'
import type { AppleIntegrationStatus } from '../../shared/appleApi'
import { loadKioskPin, saveKioskPin } from './KioskPinGate'
import { SecuritySettingsPanel } from './SecuritySettingsPanel'
import { HouseholdPermissionsView } from './HouseholdPermissionsView'
import { MicrosoftConnectPanel } from './MicrosoftConnectPanel'
import { OneDriveFileManager } from './OneDriveFileManager'
import { OutlookPowerPanel } from './OutlookPowerPanel'
import { TeamsPanel } from './TeamsPanel'
import { GoogleConnectPanel } from './GoogleConnectPanel'
import { AppleConnectPanel } from './AppleConnectPanel'
import { CategoriesManager } from './CategoriesManager'
import { CalendarItemRow } from './CalendarItem'
import { MultiDaySpanBar } from './MultiDaySpanBar'
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
  itemDisplayOptions: ItemDisplayOptions
  onItemDisplayOptionsChange: (options: ItemDisplayOptions) => void
  calendarPreferences: CalendarPreferences
  onCalendarPreferencesChange: (prefs: CalendarPreferences) => void
  integrationPreferences: IntegrationPreferences
  onIntegrationPreferencesChange: (prefs: IntegrationPreferences) => void
  integrationAccountDefaults: IntegrationAccountDefaults
  onIntegrationAccountDefaultsChange: (defaults: IntegrationAccountDefaults) => void
  graphCalendars: GraphCalendarDto[]
  graphGoogleCalendars: GoogleCalendarDto[]
  graphTodoLists: GraphTodoListDto[]
  onSaveCategory: (category: Category) => void
  onDeleteCategory: (id: string) => void
  permissionsConfig: HouseholdPermissionsConfig
  onPermissionsChange: (config: HouseholdPermissionsConfig) => void
  microsoftStatus: MicrosoftIntegrationStatus | null
  microsoftLoading: boolean
  onMicrosoftRefresh: () => void
  googleStatus: GoogleIntegrationStatus | null
  googleLoading: boolean
  onGoogleRefresh: () => void
  appleStatus: AppleIntegrationStatus | null
  appleLoading: boolean
  onAppleRefresh: () => void
  emailAccounts: EmailAccount[]
  calendarAccounts: EmailAccount[]
  usingRealMicrosoft: boolean
  usingRealGoogle: boolean
  usingRealApple: boolean
  onShowCalendarAccount: (accountId: string) => void
  onShowToast?: (message: string) => void
  onOpenBoard?: () => void
  onEnterKiosk?: () => void
  sharedBoardCount?: number
  authEnabled?: boolean
  authUser?: AuthUser | null
  onAuthUserUpdated?: (user: AuthUser) => void
  onLogout?: () => void
  onOpenSuperAdmin?: () => void
  /** Rendered inside the side panel — hides duplicate page header. */
  embedded?: boolean
}

const GROUP_OPTIONS: ListGroupBy[] = ['none', 'category', 'time', 'kind']
const SORT_OPTIONS: ListSortBy[] = ['time', 'alpha']
const ITEM_PRESET_OPTIONS: ItemDisplayPreset[] = ['classic', 'minimal', 'dense', 'bold', 'custom']
const DENSITY_OPTIONS: ItemCardDensity[] = ['comfortable', 'compact', 'minimal']
const COLOR_STYLE_OPTIONS: ItemColorStyle[] = [
  'accent-bar',
  'tinted',
  'left-border',
  'dot-only',
  'filled',
]
const TIME_PLACEMENT_OPTIONS: ItemTimePlacement[] = ['above-title', 'inline-title', 'hidden']
const TITLE_SIZE_OPTIONS: ItemTitleSize[] = ['sm', 'md', 'lg']
const MULTI_DAY_LAYOUT_OPTIONS: MultiDayAllDayLayout[] = ['span-bar', 'repeat-daily']

export function SettingsView({
  categories,
  items,
  listOptions,
  onListOptionsChange,
  itemDisplayOptions,
  onItemDisplayOptionsChange,
  calendarPreferences,
  onCalendarPreferencesChange,
  integrationPreferences,
  onIntegrationPreferencesChange,
  integrationAccountDefaults,
  onIntegrationAccountDefaultsChange,
  graphCalendars,
  graphGoogleCalendars,
  graphTodoLists,
  onSaveCategory,
  onDeleteCategory,
  permissionsConfig,
  onPermissionsChange,
  microsoftStatus,
  microsoftLoading,
  onMicrosoftRefresh,
  googleStatus,
  googleLoading,
  onGoogleRefresh,
  appleStatus,
  appleLoading,
  onAppleRefresh,
  emailAccounts,
  calendarAccounts,
  usingRealMicrosoft,
  usingRealGoogle,
  usingRealApple,
  onShowCalendarAccount,
  onShowToast,
  onOpenBoard,
  onEnterKiosk,
  sharedBoardCount = 0,
  authEnabled = false,
  authUser,
  onAuthUserUpdated,
  onLogout,
  onOpenSuperAdmin,
  embedded = false,
}: SettingsViewProps) {
  const [kioskPin, setKioskPin] = useState(() => loadKioskPin())
  const [showSyncHelp, setShowSyncHelp] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const outlookPanelRef = useRef<HTMLDivElement>(null)
  const googlePanelRef = useRef<HTMLDivElement>(null)
  const applePanelRef = useRef<HTMLDivElement>(null)
  const defaultMicrosoftAccountId =
    integrationAccountDefaults.defaultMicrosoftAccountId ??
    microsoftStatus?.accounts[0]?.id ??
    ''

  const defaultGoogleAccountId =
    integrationAccountDefaults.defaultGoogleAccountId ??
    googleStatus?.accounts[0]?.id ??
    ''

  const calendarsForDefaultGoogleAccount = useMemo(
    () =>
      graphGoogleCalendars.filter(
        (calendar) => calendar.connectedAccountId === defaultGoogleAccountId,
      ),
    [graphGoogleCalendars, defaultGoogleAccountId],
  )

  const googleMailLabels = [
    { value: 'INBOX', label: 'Inbox' },
    { value: 'SENT', label: 'Sent' },
    { value: 'DRAFT', label: 'Drafts' },
  ]

  const calendarsForDefaultAccount = useMemo(
    () => graphCalendars.filter((calendar) => calendar.connectedAccountId === defaultMicrosoftAccountId),
    [graphCalendars, defaultMicrosoftAccountId],
  )

  const todoListsForDefaultAccount = useMemo(
    () => graphTodoLists.filter((list) => list.connectedAccountId === defaultMicrosoftAccountId),
    [graphTodoLists, defaultMicrosoftAccountId],
  )

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1
    }
    return counts
  }, [items])

  const previewCategory = categories.find((c) => c.kind === 'event') ?? categories[0]
  const previewTaskCategory = categories.find((c) => c.kind === 'task') ?? previewCategory
  const previewWeekStart = useMemo(() => startOfWeek(new Date(), 1), [])
  const previewItems = useMemo((): CalendarItem[] => {
    const eventColour = previewCategory?.colour ?? '#6366f1'
    const eventCategoryId = previewCategory?.id ?? 'preview-event-cat'
    const taskColour = previewTaskCategory?.colour ?? '#10b981'
    const taskCategoryId = previewTaskCategory?.id ?? 'preview-task-cat'
    const weekDays = getWeekDays(previewWeekStart)
    const midWeek = weekDays[2] ?? new Date()
    const endWeek = weekDays[4] ?? addDays(midWeek, 2)
    return [
      {
        id: 'preview-event',
        title: 'Team standup',
        categoryId: eventCategoryId,
        colour: eventColour,
        date: toISODate(weekDays[1] ?? midWeek),
        startTime: '09:30',
        endTime: '10:00',
        allDay: false,
        accountId: 'preview',
      },
      {
        id: 'preview-multiday',
        title: 'Annual leave',
        categoryId: eventCategoryId,
        colour: eventColour,
        date: toISODate(midWeek),
        endDate: toISODate(endWeek),
        allDay: true,
        accountId: 'preview',
      },
      {
        id: 'preview-task',
        title: 'Send invoice to Henderson',
        categoryId: taskCategoryId,
        colour: taskColour,
        date: toISODate(weekDays[1] ?? midWeek),
        allDay: true,
        accountId: 'preview',
        notes: 'Include Q2 breakdown',
      },
    ]
  }, [previewCategory, previewTaskCategory, previewWeekStart])

  const previewSpanSegments = useMemo(
    () => getWeekSpanSegments(previewItems, previewWeekStart),
    [previewItems, previewWeekStart],
  )

  const changeItemDisplay = (patch: Partial<ItemDisplayOptions>) => {
    onItemDisplayOptionsChange({
      ...itemDisplayOptions,
      ...patch,
      preset: 'custom',
    })
  }

  const changeItemDisplayPreset = (preset: ItemDisplayPreset) => {
    if (preset === 'custom') {
      onItemDisplayOptionsChange({ ...itemDisplayOptions, preset: 'custom' })
      return
    }
    onItemDisplayOptionsChange(applyItemDisplayPreset(preset))
  }

  const scrollToOutlook = () => {
    outlookPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const scrollToGoogle = () => {
    googlePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const scrollToApple = () => {
    applePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
    <div className={embedded ? 'px-2 pb-6 pt-1' : 'px-4 pb-6 pt-2 safe-top'}>
      {!embedded && (
        <div className="mb-4 flex items-start justify-between gap-2">
          <SectionHeader title="Settings" />
          <ListOptionsMenu
            categories={categories}
            options={listOptions}
            onChange={onListOptionsChange}
          />
        </div>
      )}
      {embedded && (
        <div className="mb-3 flex justify-end px-1">
          <ListOptionsMenu
            categories={categories}
            options={listOptions}
            onChange={onListOptionsChange}
          />
        </div>
      )}

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

      <SettingsGroup title="Item appearance">
        <p className="px-4 pb-3 pt-1 text-caption text-wf-text-tertiary">
          How events and tasks look in week board, lists, planner, and today.
        </p>
        <div className="mx-4 mb-4 rounded-2xl border border-wf-border bg-wf-bg p-2">
          {itemDisplayOptions.multiDayAllDayLayout === 'span-bar' && previewSpanSegments.length > 0 && (
            <div className="mb-2 overflow-hidden rounded-xl border border-wf-border bg-wf-surface">
              <MultiDaySpanBar
                segments={previewSpanSegments}
                weekStart={previewWeekStart}
                compact
                seamless
                showDayLabels={false}
              />
            </div>
          )}
          {previewItems
            .filter((item) => item.id !== 'preview-multiday' || itemDisplayOptions.multiDayAllDayLayout === 'repeat-daily')
            .map((item) => (
            <CalendarItemRow
              key={item.id}
              item={item}
              categories={categories}
              displayOptions={itemDisplayOptions}
              spanPosition={
                item.id === 'preview-multiday' && itemDisplayOptions.multiDayAllDayLayout === 'repeat-daily'
                  ? 'start'
                  : 'single'
              }
            />
          ))}
        </div>
        <SettingsSelectRow
          label="Style preset"
          value={itemDisplayOptions.preset}
          options={ITEM_PRESET_OPTIONS.map((key) => ({
            value: key,
            label: ITEM_DISPLAY_PRESET_LABELS[key],
          }))}
          onChange={changeItemDisplayPreset}
        />
        <SettingsSelectRow
          label="Multi-day all-day"
          value={itemDisplayOptions.multiDayAllDayLayout}
          options={MULTI_DAY_LAYOUT_OPTIONS.map((key) => ({
            value: key,
            label: MULTI_DAY_ALL_DAY_LAYOUT_LABELS[key],
          }))}
          onChange={(multiDayAllDayLayout) => changeItemDisplay({ multiDayAllDayLayout })}
        />
        <SettingsSelectRow
          label="Density"
          value={itemDisplayOptions.density}
          options={DENSITY_OPTIONS.map((key) => ({ value: key, label: ITEM_DENSITY_LABELS[key] }))}
          onChange={(density) => changeItemDisplay({ density })}
        />
        <SettingsSelectRow
          label="Colour style"
          value={itemDisplayOptions.colorStyle}
          options={COLOR_STYLE_OPTIONS.map((key) => ({
            value: key,
            label: ITEM_COLOR_STYLE_LABELS[key],
          }))}
          onChange={(colorStyle) => changeItemDisplay({ colorStyle })}
        />
        <SettingsSelectRow
          label="Time label"
          value={itemDisplayOptions.timePlacement}
          options={TIME_PLACEMENT_OPTIONS.map((key) => ({
            value: key,
            label: ITEM_TIME_PLACEMENT_LABELS[key],
          }))}
          onChange={(timePlacement) => changeItemDisplay({ timePlacement })}
        />
        <SettingsSelectRow
          label="Title size"
          value={itemDisplayOptions.titleSize}
          options={TITLE_SIZE_OPTIONS.map((key) => ({
            value: key,
            label: ITEM_TITLE_SIZE_LABELS[key],
          }))}
          onChange={(titleSize) => changeItemDisplay({ titleSize })}
        />
        <SettingsToggleRow
          label="Category badge"
          checked={itemDisplayOptions.showCategoryBadge}
          onChange={(showCategoryBadge) => changeItemDisplay({ showCategoryBadge })}
        />
        <SettingsToggleRow
          label="Notes preview"
          checked={itemDisplayOptions.showNotesPreview}
          onChange={(showNotesPreview) => changeItemDisplay({ showNotesPreview })}
        />
        <SettingsToggleRow
          label="Anytime label on tasks"
          checked={itemDisplayOptions.showTaskAnytimeLabel}
          onChange={(showTaskAnytimeLabel) => changeItemDisplay({ showTaskAnytimeLabel })}
        />
        <SettingsToggleRow
          label="Strike completed items"
          checked={itemDisplayOptions.showCompletedStrike}
          onChange={(showCompletedStrike) => changeItemDisplay({ showCompletedStrike })}
        />
        <SettingsToggleRow
          label="Card shadow"
          checked={itemDisplayOptions.cardShadow}
          onChange={(cardShadow) => changeItemDisplay({ cardShadow })}
        />
        <SettingsToggleRow
          label="Card border"
          checked={itemDisplayOptions.cardBorder}
          onChange={(cardBorder) => changeItemDisplay({ cardBorder })}
        />
        <SettingsActionRow
          label="Reset item appearance"
          value="Defaults"
          onClick={() => onItemDisplayOptionsChange({ ...DEFAULT_ITEM_DISPLAY })}
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
          What stays in Gmail/Outlook vs what {APP_NAME} stores.
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

        <div ref={googlePanelRef}>
          <GoogleConnectPanel
            status={googleStatus}
            loading={googleLoading}
            onRefresh={onGoogleRefresh}
          />
        </div>

        <div ref={applePanelRef}>
          <AppleConnectPanel
            status={appleStatus}
            loading={appleLoading}
            onRefresh={onAppleRefresh}
            onShowToast={onShowToast}
          />
        </div>

        {usingRealMicrosoft && (microsoftStatus?.accounts.length ?? 0) > 0 && (
          <>
            <p className="border-t border-wf-border/50 px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
              Defaults for new calendar events, tasks, and contacts when an item does not already
              specify an account.
            </p>
            <SettingsSelectRow
              label="Default Outlook account"
              value={
                integrationAccountDefaults.defaultMicrosoftAccountId ??
                microsoftStatus?.accounts[0]?.id ??
                ''
              }
              options={(microsoftStatus?.accounts ?? []).map((account) => ({
                value: account.id,
                label: account.email,
              }))}
              onChange={(defaultMicrosoftAccountId) =>
                onIntegrationAccountDefaultsChange({
                  ...integrationAccountDefaults,
                  defaultMicrosoftAccountId,
                })
              }
            />
            {calendarsForDefaultAccount.length > 0 && (
              <SettingsSelectRow
                label="Default calendar"
                value={integrationAccountDefaults.calendar?.defaultCalendarId ?? ''}
                options={calendarsForDefaultAccount.map((calendar) => ({
                  value: calendar.graphCalendarId,
                  label: `${calendar.name}${calendar.isDefault ? ' (Outlook default)' : ''}`,
                }))}
                onChange={(defaultCalendarId) =>
                  onIntegrationAccountDefaultsChange({
                    ...integrationAccountDefaults,
                    calendar: {
                      ...integrationAccountDefaults.calendar,
                      defaultAccountId: defaultMicrosoftAccountId,
                      defaultCalendarId,
                    },
                  })
                }
              />
            )}
            {todoListsForDefaultAccount.length > 0 && (
              <SettingsSelectRow
                label="Default To Do list"
                value={integrationAccountDefaults.tasks?.defaultTodoListId ?? ''}
                options={todoListsForDefaultAccount.map((list) => ({
                  value: list.graphListId,
                  label: `${list.name}${list.isDefault ? ' (Outlook default)' : ''}`,
                }))}
                onChange={(defaultTodoListId) =>
                  onIntegrationAccountDefaultsChange({
                    ...integrationAccountDefaults,
                    tasks: {
                      ...integrationAccountDefaults.tasks,
                      defaultAccountId: defaultMicrosoftAccountId,
                      defaultTodoListId,
                    },
                  })
                }
              />
            )}
            <p className="px-4 pb-3 text-caption text-wf-text-tertiary">
              Reconnect Google after scope updates (send, Drive). Reconnect Outlook after Contacts scope changes.
            </p>
          </>
        )}

        {usingRealMicrosoft && (microsoftStatus?.accounts.length ?? 0) > 0 && (
          <div className="border-t border-wf-border/50 px-4 py-4">
            <p className="mb-3 text-caption font-semibold text-wf-text-secondary">OneDrive files</p>
            <OneDriveFileManager
              accounts={microsoftStatus?.accounts ?? []}
              defaultAccountId={integrationAccountDefaults.defaultMicrosoftAccountId}
            />
            <OutlookPowerPanel
              accounts={microsoftStatus?.accounts ?? []}
              defaultAccountId={integrationAccountDefaults.defaultMicrosoftAccountId}
              integrationAccountDefaults={integrationAccountDefaults}
              onIntegrationAccountDefaultsChange={onIntegrationAccountDefaultsChange}
            />
            <TeamsPanel
              accounts={microsoftStatus?.accounts ?? []}
              upcomingItems={items}
              defaultAccountId={integrationAccountDefaults.defaultMicrosoftAccountId}
            />
          </div>
        )}

        {usingRealGoogle && (googleStatus?.accounts.length ?? 0) > 0 && (
          <>
            <p className="border-t border-wf-border/50 px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
              Defaults for new Gmail messages and Google Calendar events.
            </p>
            <SettingsSelectRow
              label="Default Google account"
              value={
                integrationAccountDefaults.defaultGoogleAccountId ??
                googleStatus?.accounts[0]?.id ??
                ''
              }
              options={(googleStatus?.accounts ?? []).map((account) => ({
                value: account.id,
                label: account.email,
              }))}
              onChange={(defaultGoogleAccountId) =>
                onIntegrationAccountDefaultsChange({
                  ...integrationAccountDefaults,
                  defaultGoogleAccountId,
                })
              }
            />
            {calendarsForDefaultGoogleAccount.length > 0 && (
              <SettingsSelectRow
                label="Default Google calendar"
                value={integrationAccountDefaults.googleCalendar?.defaultCalendarId ?? ''}
                options={calendarsForDefaultGoogleAccount.map((calendar) => ({
                  value: calendar.googleCalendarId,
                  label: `${calendar.name}${calendar.isDefault ? ' (primary)' : ''}`,
                }))}
                onChange={(defaultCalendarId) =>
                  onIntegrationAccountDefaultsChange({
                    ...integrationAccountDefaults,
                    googleCalendar: {
                      ...integrationAccountDefaults.googleCalendar,
                      defaultAccountId: defaultGoogleAccountId,
                      defaultCalendarId,
                    },
                  })
                }
              />
            )}
            {googleMailLabels.length > 0 && (
              <SettingsSelectRow
                label="Default Gmail label"
                value={integrationAccountDefaults.googleEmail?.defaultLabelId ?? 'INBOX'}
                options={googleMailLabels.map((label) => ({
                  value: label.value,
                  label: label.label,
                }))}
                onChange={(defaultLabelId) =>
                  onIntegrationAccountDefaultsChange({
                    ...integrationAccountDefaults,
                    googleEmail: {
                      ...integrationAccountDefaults.googleEmail,
                      defaultAccountId: defaultGoogleAccountId,
                      defaultLabelId,
                    },
                  })
                }
              />
            )}
          </>
        )}

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
          phaseLabel={googleStatus?.configured ? 'Connect' : 'Phase 10'}
          notifyChecked={integrationPreferences.googleInterest}
          onNotifyChange={(googleInterest) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, googleInterest })
          }
          onConnect={scrollToGoogle}
        />
        <SettingsIntegrationRow
          label="Apple Mail"
          description="iCloud mail with hyperlink fallbacks where APIs are limited."
          phaseLabel={usingRealApple ? 'Linked' : 'Link in Settings'}
          notifyChecked={integrationPreferences.appleInterest}
          onNotifyChange={(appleInterest) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, appleInterest })
          }
          onConnect={scrollToApple}
        />
      </SettingsGroup>

      <SettingsGroup title="Integrations">
        <p className="px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
          Outlook contacts import when connected (Contacts tab). Notes stay local until OneNote API.
        </p>
        <SettingsIntegrationRow
          label="Google Calendar"
          description="Sync events from Google Calendar accounts."
          phaseLabel={
            googleStatus?.connected && (googleStatus.accounts.length ?? 0) > 0
              ? 'Connected'
              : googleStatus?.configured
                ? 'Connect'
                : 'Phase 10'
          }
          notifyChecked={integrationPreferences.googleInterest}
          onNotifyChange={(googleInterest) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, googleInterest })
          }
          onConnect={scrollToGoogle}
        />
        <SettingsIntegrationRow
          label="Apple Calendar"
          description="Subscribe to iCloud calendars via public calendar link."
          phaseLabel={usingRealApple ? 'Linked' : 'Link in Settings'}
          notifyChecked={integrationPreferences.appleInterest}
          onNotifyChange={(appleInterest) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, appleInterest })
          }
          onConnect={scrollToApple}
        />
        <SettingsIntegrationRow
          label="Apple Notes"
          description="No public iCloud Notes API — open iCloud Notes or copy note text."
          phaseLabel={usingRealApple ? 'Linked' : 'Link in Settings'}
          notifyChecked={integrationPreferences.appleInterest}
          onNotifyChange={(appleInterest) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, appleInterest })
          }
          onConnect={scrollToApple}
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

      {authEnabled && (
        <SettingsGroup title="Account">
          {authUser && (
            <>
              <SettingsRow label="Signed in as" value={authUser.displayName} />
              <SettingsRow label="Email" value={authUser.email} muted />
            </>
          )}
          {authUser?.isSuperAdmin && onOpenSuperAdmin && (
            <SettingsActionRow
              label="Super admin"
              value="Open console"
              onClick={onOpenSuperAdmin}
            />
          )}
          {onLogout && (
            <SettingsActionRow
              label="Sign out"
              value="End session"
              onClick={() => void onLogout()}
            />
          )}
        </SettingsGroup>
      )}

      {authEnabled && authUser && onAuthUserUpdated && (
        <SecuritySettingsPanel
          user={authUser}
          onUserUpdated={onAuthUserUpdated}
          onShowToast={onShowToast}
        />
      )}

      <SettingsGroup title="About">
        <SettingsRow label="Version" value="0.1.0 prototype" />
        <SettingsRow label="App" value={APP_NAME} />
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
