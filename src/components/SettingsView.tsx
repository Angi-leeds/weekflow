import { useCallback, useMemo, useRef, useState } from 'react'
import type {
  CalendarItem,
  CalendarPreferences,
  CalendarSourcePreferences,
  Category,
  EmailAccount,
  IntegrationAccountDefaults,
  IntegrationPreferences,
  ItemDisplayOptions,
  ItemDisplayPreset,
  ListDisplayOptions,
  TodayHighlightOptions,
  UnifiedCalendarSource,
} from '../types'
import type { CategoryAutomation, CategoryAutomationMap } from '../../shared/categoryAutomation'
import {
  DEFAULT_VIEW_LABELS,
  ITEM_DISPLAY_PRESET_LABELS,
  LIST_GROUP_LABELS,
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
import { loadKioskPin } from './KioskPinGate'
import { HouseholdPermissionsView } from './HouseholdPermissionsView'
import { SectionHeader } from './ui/SectionHeader'
import {
  isSettingsSectionOpen,
  setSettingsSectionOpen,
  type SettingsSectionId,
  type SettingsSectionState,
} from '../lib/settingsSectionState'
import { SyncHelpView } from './SyncHelpView'
import { SettingsPageSections } from './settings/SettingsPageSections'

interface SettingsViewProps {
  categories: Category[]
  items: CalendarItem[]
  categoryAutomationMap?: CategoryAutomationMap
  listOptions: ListDisplayOptions
  onListOptionsChange: (options: ListDisplayOptions) => void
  itemDisplayOptions: ItemDisplayOptions
  onItemDisplayOptionsChange: (options: ItemDisplayOptions) => void
  todayHighlight: TodayHighlightOptions
  onTodayHighlightChange: (options: TodayHighlightOptions) => void
  calendarPreferences: CalendarPreferences
  onCalendarPreferencesChange: (prefs: CalendarPreferences) => void
  integrationPreferences: IntegrationPreferences
  onIntegrationPreferencesChange: (prefs: IntegrationPreferences) => void
  integrationAccountDefaults: IntegrationAccountDefaults
  onIntegrationAccountDefaultsChange: (defaults: IntegrationAccountDefaults) => void
  graphCalendars: GraphCalendarDto[]
  graphGoogleCalendars: GoogleCalendarDto[]
  graphTodoLists: GraphTodoListDto[]
  calendarSources: UnifiedCalendarSource[]
  calendarSourcePrefs: CalendarSourcePreferences
  onCalendarSourcePrefsChange: (prefs: CalendarSourcePreferences) => void
  onSaveCategory: (category: Category, automation?: CategoryAutomation) => void
  onDeleteCategory: (id: string) => void
  permissionsConfig: HouseholdPermissionsConfig
  onPermissionsChange: (config: HouseholdPermissionsConfig) => void
  settingsSectionState: SettingsSectionState
  onSettingsSectionStateChange: (state: SettingsSectionState) => void
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

export function SettingsView({
  categories,
  items,
  categoryAutomationMap = {},
  listOptions,
  onListOptionsChange,
  itemDisplayOptions,
  onItemDisplayOptionsChange,
  todayHighlight,
  onTodayHighlightChange,
  calendarPreferences,
  onCalendarPreferencesChange,
  integrationPreferences,
  onIntegrationPreferencesChange,
  integrationAccountDefaults,
  onIntegrationAccountDefaultsChange,
  graphCalendars,
  graphGoogleCalendars,
  graphTodoLists,
  calendarSources,
  calendarSourcePrefs,
  onCalendarSourcePrefsChange,
  onSaveCategory,
  onDeleteCategory,
  permissionsConfig,
  onPermissionsChange,
  settingsSectionState,
  onSettingsSectionStateChange,
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

  const sectionOpen = useCallback(
    (id: SettingsSectionId) => isSettingsSectionOpen(id, settingsSectionState),
    [settingsSectionState],
  )

  const setSectionOpen = useCallback(
    (id: SettingsSectionId, open: boolean) => {
      onSettingsSectionStateChange(setSettingsSectionOpen(settingsSectionState, id, open))
    },
    [settingsSectionState, onSettingsSectionStateChange],
  )

  const scrollToOutlook = () => {
    setSectionOpen('connected-accounts', true)
    outlookPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const connectedAccountsSummary = useMemo(() => {
    const msCount = microsoftStatus?.accounts.length ?? 0
    const googleCount = googleStatus?.accounts.length ?? 0
    const appleCount = appleStatus?.accounts.length ?? 0
    const labels: string[] = []
    if (msCount > 0) labels.push('Microsoft')
    if (googleCount > 0) labels.push('Google')
    if (appleCount > 0) labels.push('Apple')
    if (labels.length === 0) return 'Not connected'
    const total = msCount + googleCount + appleCount
    return `${labels.join(' · ')} · ${total} account${total === 1 ? '' : 's'}`
  }, [microsoftStatus, googleStatus, appleStatus])

  const calendarTasksSummary = useMemo(() => {
    const parts = [DEFAULT_VIEW_LABELS[calendarPreferences.defaultView]]
    if (usingRealMicrosoft) {
      parts.push(
        calendarSourcePrefs.showMicrosoftTodoTasks ? 'To Do on calendar' : 'To Do hidden on calendar',
      )
    }
    return parts.join(' · ')
  }, [calendarPreferences.defaultView, calendarSourcePrefs.showMicrosoftTodoTasks, usingRealMicrosoft])

  const displaySummary = useMemo(
    () =>
      `${ITEM_DISPLAY_PRESET_LABELS[itemDisplayOptions.preset]} · ${LIST_GROUP_LABELS[listOptions.groupBy]}`,
    [itemDisplayOptions.preset, listOptions.groupBy],
  )

  const householdSummary = useMemo(() => {
    const member = MOCK_HOUSEHOLD_MEMBERS.find(
      (entry) => entry.id === permissionsConfig.activeMemberId,
    )
    return `${member?.displayName ?? 'Member'} · ${sharedBoardCount} on board`
  }, [permissionsConfig.activeMemberId, sharedBoardCount])

  const accountSummary = useMemo(() => {
    if (!authUser) return 'Sign in'
    return authUser.totpEnabled ? `${authUser.displayName} · 2FA on` : authUser.displayName
  }, [authUser])

  const aboutSummary = useMemo(() => `${APP_NAME} · v0.1.0`, [])

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
        <div className="mb-4">
          <SectionHeader title="Settings" />
        </div>
      )}

      <SettingsPageSections
        sectionOpen={sectionOpen}
        setSectionOpen={setSectionOpen}
        connectedAccountsSummary={connectedAccountsSummary}
        calendarTasksSummary={calendarTasksSummary}
        displaySummary={displaySummary}
        householdSummary={householdSummary}
        accountSummary={accountSummary}
        aboutSummary={aboutSummary}
        categories={categories}
        items={items}
        itemCounts={itemCounts}
        listOptions={listOptions}
        onListOptionsChange={onListOptionsChange}
        itemDisplayOptions={itemDisplayOptions}
        onItemDisplayOptionsChange={onItemDisplayOptionsChange}
        changeItemDisplay={changeItemDisplay}
        changeItemDisplayPreset={changeItemDisplayPreset}
        previewItems={previewItems}
        previewSpanSegments={previewSpanSegments}
        previewWeekStart={previewWeekStart}
        todayHighlight={todayHighlight}
        onTodayHighlightChange={onTodayHighlightChange}
        calendarPreferences={calendarPreferences}
        onCalendarPreferencesChange={onCalendarPreferencesChange}
        calendarSources={calendarSources}
        calendarSourcePrefs={calendarSourcePrefs}
        onCalendarSourcePrefsChange={onCalendarSourcePrefsChange}
        calendarAccounts={calendarAccounts}
        usingRealMicrosoft={usingRealMicrosoft}
        usingRealGoogle={usingRealGoogle}
        usingRealApple={usingRealApple}
        onShowCalendarAccount={onShowCalendarAccount}
        categoryAutomationMap={categoryAutomationMap}
        onSaveCategory={onSaveCategory}
        onDeleteCategory={onDeleteCategory}
        permissionsConfig={permissionsConfig}
        onPermissionsChange={onPermissionsChange}
        onShowPermissions={() => setShowPermissions(true)}
        onOpenBoard={onOpenBoard}
        onEnterKiosk={onEnterKiosk}
        sharedBoardCount={sharedBoardCount}
        kioskPin={kioskPin}
        onKioskPinChange={setKioskPin}
        onShowSyncHelp={() => setShowSyncHelp(true)}
        microsoftStatus={microsoftStatus}
        microsoftLoading={microsoftLoading}
        onMicrosoftRefresh={onMicrosoftRefresh}
        googleStatus={googleStatus}
        googleLoading={googleLoading}
        onGoogleRefresh={onGoogleRefresh}
        appleStatus={appleStatus}
        appleLoading={appleLoading}
        onAppleRefresh={onAppleRefresh}
        onShowToast={onShowToast}
        integrationPreferences={integrationPreferences}
        onIntegrationPreferencesChange={onIntegrationPreferencesChange}
        integrationAccountDefaults={integrationAccountDefaults}
        onIntegrationAccountDefaultsChange={onIntegrationAccountDefaultsChange}
        graphCalendars={graphCalendars}
        graphGoogleCalendars={graphGoogleCalendars}
        graphTodoLists={graphTodoLists}
        emailAccounts={emailAccounts}
        defaultMicrosoftAccountId={defaultMicrosoftAccountId}
        defaultGoogleAccountId={defaultGoogleAccountId}
        calendarsForDefaultAccount={calendarsForDefaultAccount}
        calendarsForDefaultGoogleAccount={calendarsForDefaultGoogleAccount}
        todoListsForDefaultAccount={todoListsForDefaultAccount}
        googleMailLabels={googleMailLabels}
        scrollToOutlook={scrollToOutlook}
        outlookPanelRef={outlookPanelRef}
        googlePanelRef={googlePanelRef}
        applePanelRef={applePanelRef}
        authEnabled={authEnabled}
        authUser={authUser}
        onAuthUserUpdated={onAuthUserUpdated}
        onLogout={onLogout}
        onOpenSuperAdmin={onOpenSuperAdmin}
      />
    </div>
  )
}
