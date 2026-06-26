import type { AuthUser } from '../../../shared/auth'
import { MOCK_HOUSEHOLD_MEMBERS } from '../../../shared/householdPermissions'
import type { AppleIntegrationStatus } from '../../../shared/appleApi'
import type { GoogleCalendarDto, GoogleIntegrationStatus } from '../../../shared/googleApi'
import type {
  GraphCalendarDto,
  GraphTodoListDto,
  MicrosoftIntegrationStatus,
} from '../../../shared/microsoftGraph'
import { APP_NAME } from '../../branding'
import type { HouseholdPermissionsConfig } from '../../lib/householdPermissions'
import { categoryDiaryStatusLabel } from '../../lib/diaryVisibility'
import { DIARY_SETTINGS } from '../../lib/diaryHelpCopy'
import {
  TASK_PROVIDER_CALENDAR_TOGGLE_DESCRIPTIONS,
  TASK_PROVIDER_LABELS,
} from '../../lib/providerTasks'
import type { SettingsSectionId } from '../../lib/settingsSectionState'
import type {
  CalendarItem,
  CalendarPreferences,
  CalendarSourcePreferences,
  Category,
  EmailAccount,
  IntegrationAccountDefaults,
  IntegrationPreferences,
  ItemDisplayOptions,
  ListDisplayOptions,
  TodayHighlightOptions,
  UnifiedCalendarSource,
  WeekStartsOn,
  WeekViewAnchor,
} from '../../types'
import {
  DEFAULT_ITEM_DISPLAY,
  DEFAULT_VIEW_LABELS,
  DIARY_TASKS_MODE_DESCRIPTIONS,
  DIARY_TASKS_MODE_LABELS,
  DIARY_TASKS_MODE_OPTIONS,
  ITEM_COLOR_STYLE_LABELS,
  ITEM_DENSITY_LABELS,
  ITEM_DISPLAY_PRESET_LABELS,
  ITEM_TIME_PLACEMENT_LABELS,
  ITEM_TITLE_SIZE_LABELS,
  ITEM_TITLE_SIZE_OPTIONS,
  LIST_GROUP_LABELS,
  LIST_SORT_LABELS,
  MULTI_DAY_ALL_DAY_LAYOUT_LABELS,
  SETTINGS_DEFAULT_VIEWS,
  TIME_FORMAT_LABELS,
  WEEK_START_LABELS,
  WEEK_VIEW_ANCHOR_LABELS,
} from '../../types'
import { AppleConnectPanel } from '../AppleConnectPanel'
import { CalendarItemRow } from '../CalendarItem'
import { CalendarPresetSettingsPanel } from '../CalendarPresetSettingsPanel'
import { CategoriesManager } from '../CategoriesManager'
import { GoogleConnectPanel } from '../GoogleConnectPanel'
import { saveKioskPin } from '../KioskPinGate'
import { MicrosoftConnectPanel } from '../MicrosoftConnectPanel'
import { MultiDaySpanBar } from '../MultiDaySpanBar'
import { OneDriveFileManager } from '../OneDriveFileManager'
import { OutlookPowerPanel } from '../OutlookPowerPanel'
import { SecuritySettingsPanel } from '../SecuritySettingsPanel'
import { TeamsPanel } from '../TeamsPanel'
import { TodayHighlightSettingsPanel } from '../TodayHighlightSettingsPanel'
import {
  SettingsActionRow,
  SettingsCategoryFilterRow,
  SettingsInfoCallout,
  SettingsSelectRow,
  SettingsToggleRow,
} from '../ui/SettingsControls'
import {
  SettingsCollapsibleGroup,
  SettingsCollapsibleSection,
} from '../ui/SettingsCollapsibleGroup'
import { DiaryPreviewPanel } from './DiaryPreviewPanel'

export interface SettingsPageSectionsProps {
  sectionOpen: (id: SettingsSectionId) => boolean
  setSectionOpen: (id: SettingsSectionId, open: boolean) => void
  connectedAccountsSummary: string
  calendarTasksSummary: string
  displaySummary: string
  householdSummary: string
  accountSummary: string
  aboutSummary: string
  categories: Category[]
  items: CalendarItem[]
  itemCounts: Record<string, number>
  listOptions: ListDisplayOptions
  onListOptionsChange: (options: ListDisplayOptions) => void
  itemDisplayOptions: ItemDisplayOptions
  onItemDisplayOptionsChange: (options: ItemDisplayOptions) => void
  changeItemDisplay: (patch: Partial<ItemDisplayOptions>) => void
  changeItemDisplayPreset: (preset: ItemDisplayOptions['preset']) => void
  previewItems: CalendarItem[]
  previewSpanSegments: ReturnType<typeof import('../../dateUtils').getWeekSpanSegments>
  previewWeekStart: Date
  todayHighlight: TodayHighlightOptions
  onTodayHighlightChange: (options: TodayHighlightOptions) => void
  calendarPreferences: CalendarPreferences
  onCalendarPreferencesChange: (prefs: CalendarPreferences) => void
  calendarSources: UnifiedCalendarSource[]
  calendarSourcePrefs: CalendarSourcePreferences
  onCalendarSourcePrefsChange: (prefs: CalendarSourcePreferences) => void
  calendarAccounts: EmailAccount[]
  usingRealMicrosoft: boolean
  usingRealGoogle: boolean
  usingRealApple: boolean
  onShowCalendarAccount: (accountId: string) => void
  onSaveCategory: (category: Category) => void
  onDeleteCategory: (id: string) => void
  permissionsConfig: HouseholdPermissionsConfig
  onPermissionsChange: (config: HouseholdPermissionsConfig) => void
  onShowPermissions: () => void
  onOpenBoard?: () => void
  onEnterKiosk?: () => void
  sharedBoardCount: number
  kioskPin: string
  onKioskPinChange: (pin: string) => void
  onShowSyncHelp: () => void
  microsoftStatus: MicrosoftIntegrationStatus | null
  microsoftLoading: boolean
  onMicrosoftRefresh: () => void
  googleStatus: GoogleIntegrationStatus | null
  googleLoading: boolean
  onGoogleRefresh: () => void
  appleStatus: AppleIntegrationStatus | null
  appleLoading: boolean
  onAppleRefresh: () => void
  onShowToast?: (message: string) => void
  integrationPreferences: IntegrationPreferences
  onIntegrationPreferencesChange: (prefs: IntegrationPreferences) => void
  integrationAccountDefaults: IntegrationAccountDefaults
  onIntegrationAccountDefaultsChange: (defaults: IntegrationAccountDefaults) => void
  graphCalendars: GraphCalendarDto[]
  graphGoogleCalendars: GoogleCalendarDto[]
  graphTodoLists: GraphTodoListDto[]
  emailAccounts: EmailAccount[]
  defaultMicrosoftAccountId: string
  defaultGoogleAccountId: string
  calendarsForDefaultAccount: GraphCalendarDto[]
  calendarsForDefaultGoogleAccount: GoogleCalendarDto[]
  todoListsForDefaultAccount: GraphTodoListDto[]
  googleMailLabels: { value: string; label: string }[]
  scrollToOutlook: () => void
  outlookPanelRef: React.RefObject<HTMLDivElement | null>
  googlePanelRef: React.RefObject<HTMLDivElement | null>
  applePanelRef: React.RefObject<HTMLDivElement | null>
  authEnabled: boolean
  authUser?: AuthUser | null
  onAuthUserUpdated?: (user: AuthUser) => void
  onLogout?: () => void
  onOpenSuperAdmin?: () => void
}

const GROUP_OPTIONS = ['none', 'category', 'time', 'kind'] as const
const SORT_OPTIONS = ['time', 'alpha'] as const
const ITEM_PRESET_OPTIONS = ['classic', 'minimal', 'dense', 'bold', 'custom'] as const
const DENSITY_OPTIONS = ['comfortable', 'compact', 'minimal'] as const
const COLOR_STYLE_OPTIONS = [
  'accent-bar',
  'tinted',
  'left-border',
  'dot-only',
  'filled',
] as const
const TIME_PLACEMENT_OPTIONS = ['above-title', 'inline-title', 'hidden'] as const
const MULTI_DAY_LAYOUT_OPTIONS = ['span-bar', 'repeat-daily'] as const

export function SettingsPageSections(props: SettingsPageSectionsProps) {
  const {
    sectionOpen,
    setSectionOpen,
    connectedAccountsSummary,
    calendarTasksSummary,
    displaySummary,
    householdSummary,
    accountSummary,
    aboutSummary,
    categories,
    items,
    itemCounts,
    listOptions,
    onListOptionsChange,
    itemDisplayOptions,
    onItemDisplayOptionsChange,
    changeItemDisplay,
    changeItemDisplayPreset,
    previewItems,
    previewSpanSegments,
    previewWeekStart,
    todayHighlight,
    onTodayHighlightChange,
    calendarPreferences,
    onCalendarPreferencesChange,
    calendarSources,
    calendarSourcePrefs,
    onCalendarSourcePrefsChange,
    calendarAccounts,
    usingRealMicrosoft,
    usingRealGoogle,
    usingRealApple,
    onShowCalendarAccount,
    onSaveCategory,
    onDeleteCategory,
    permissionsConfig,
    onPermissionsChange,
    onShowPermissions,
    onOpenBoard,
    onEnterKiosk,
    sharedBoardCount,
    kioskPin,
    onKioskPinChange,
    onShowSyncHelp,
    microsoftStatus,
    microsoftLoading,
    onMicrosoftRefresh,
    googleStatus,
    googleLoading,
    onGoogleRefresh,
    appleStatus,
    appleLoading,
    onAppleRefresh,
    onShowToast,
    integrationPreferences,
    onIntegrationPreferencesChange,
    integrationAccountDefaults,
    onIntegrationAccountDefaultsChange,
    defaultMicrosoftAccountId,
    defaultGoogleAccountId,
    calendarsForDefaultAccount,
    calendarsForDefaultGoogleAccount,
    todoListsForDefaultAccount,
    googleMailLabels,
    scrollToOutlook,
    outlookPanelRef,
    googlePanelRef,
    applePanelRef,
    authEnabled,
    authUser,
    onAuthUserUpdated,
    onLogout,
    onOpenSuperAdmin,
  } = props

  return (
    <>
      {authEnabled && (
        <SettingsCollapsibleGroup
          sectionId="account"
          title="Account & security"
          summary={accountSummary}
          open={sectionOpen('account')}
          onOpenChange={(open) => setSectionOpen('account', open)}
        >
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
          {authUser && onAuthUserUpdated && (
            <SecuritySettingsPanel
              user={authUser}
              onUserUpdated={onAuthUserUpdated}
              onShowToast={onShowToast}
              embedded
            />
          )}
        </SettingsCollapsibleGroup>
      )}

      <SettingsCollapsibleGroup
        sectionId="connected-accounts"
        title="Connected accounts"
        summary={connectedAccountsSummary}
        open={sectionOpen('connected-accounts')}
        onOpenChange={(open) => setSectionOpen('connected-accounts', open)}
      >
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
              Reconnect Google after scope updates (send, Drive). Reconnect Outlook after Contacts
              scope changes.
            </p>
          </>
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
              Demo inboxes — connect Outlook above to sync real mail.
            </p>
            {props.emailAccounts.map((account) => (
              <SettingsActionRow
                key={account.id}
                label={account.label}
                value={`${account.email} · Demo`}
                onClick={scrollToOutlook}
              />
            ))}
          </>
        )}

        {usingRealMicrosoft && (microsoftStatus?.accounts.length ?? 0) > 0 && (
          <SettingsCollapsibleSection
            sectionId="connected-advanced"
            title="Advanced (OneDrive · Teams · Power Automate)"
            summary="Power-user Microsoft tools"
            open={sectionOpen('connected-advanced')}
            onOpenChange={(open) => setSectionOpen('connected-advanced', open)}
          >
            <div className="px-4 py-4">
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
          </SettingsCollapsibleSection>
        )}

        <SettingsCollapsibleSection
          sectionId="sync-matrix"
          title="What syncs where"
          summary="Gmail/Outlook vs MyAxis storage"
          open={sectionOpen('sync-matrix')}
          onOpenChange={(open) => setSectionOpen('sync-matrix', open)}
        >
          <div className="px-4 pb-4 pt-2">
            <p className="mb-3 text-caption text-wf-text-tertiary">
              What stays in Gmail/Outlook vs what {APP_NAME} stores.
            </p>
            <button
              type="button"
              onClick={onShowSyncHelp}
              className="w-full rounded-xl bg-wf-accent-soft py-2.5 text-body font-semibold text-wf-accent"
            >
              View sync matrix
            </button>
          </div>
        </SettingsCollapsibleSection>

        <SettingsToggleRow
          label="Push notifications"
          description="Reminders and household updates (Phase 10)."
          checked={integrationPreferences.notificationsEnabled}
          onChange={(notificationsEnabled) =>
            onIntegrationPreferencesChange({ ...integrationPreferences, notificationsEnabled })
          }
        />
      </SettingsCollapsibleGroup>

      <SettingsCollapsibleGroup
        sectionId="calendar-tasks"
        title="Calendar & tasks"
        summary={calendarTasksSummary}
        open={sectionOpen('calendar-tasks')}
        onOpenChange={(open) => setSectionOpen('calendar-tasks', open)}
      >
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
          label="Week view opens on"
          value={calendarPreferences.weekViewAnchor}
          options={(['week-start', 'today'] as WeekViewAnchor[]).map((value) => ({
            value,
            label: WEEK_VIEW_ANCHOR_LABELS[value],
          }))}
          onChange={(weekViewAnchor) =>
            onCalendarPreferencesChange({ ...calendarPreferences, weekViewAnchor })
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
        <SettingsToggleRow
          label="Expand month weeks to fit"
          description="Show every event in month view by growing each week row — no +N more."
          checked={calendarPreferences.monthViewExpandWeeks}
          onChange={(monthViewExpandWeeks) =>
            onCalendarPreferencesChange({ ...calendarPreferences, monthViewExpandWeeks })
          }
        />
        <SettingsToggleRow
          label="Show week number"
          description="ISO week number on the left of day headers (e.g. W26)."
          checked={calendarPreferences.showWeekNumber === true}
          onChange={(showWeekNumber) =>
            onCalendarPreferencesChange({ ...calendarPreferences, showWeekNumber })
          }
        />
        <SettingsToggleRow
          label="Show day of year"
          description="Day-of-year number on the left of day headers (e.g. D177)."
          checked={calendarPreferences.showDayOfYear === true}
          onChange={(showDayOfYear) =>
            onCalendarPreferencesChange({ ...calendarPreferences, showDayOfYear })
          }
        />
        <p className="border-t border-wf-border/50 px-4 pb-2 pt-3 text-caption text-wf-text-tertiary">
          {calendarSources.length > 0
            ? 'Use preset chips on the calendar view, or tap Calendars to show or hide individual sources.'
            : usingRealMicrosoft
              ? 'Tap a calendar to filter the week view to that account.'
              : 'Demo calendars — tap to preview the account filter.'}
        </p>
        {calendarSources.length > 0 ? (
          <CalendarPresetSettingsPanel
            sources={calendarSources}
            prefs={calendarSourcePrefs}
            onChange={onCalendarSourcePrefsChange}
          />
        ) : (
          calendarAccounts.map((account) => (
            <SettingsActionRow
              key={account.id}
              label={account.label}
              value={usingRealMicrosoft ? account.email : 'Demo · tap to filter'}
              onClick={() => onShowCalendarAccount(account.id)}
            />
          ))
        )}

        <div id="settings-event-categories" className="border-t border-wf-border/50">
          <p className="px-4 pb-3 pt-3 text-caption text-wf-text-tertiary">
            {usingRealMicrosoft
              ? 'Event categories sync with Outlook — the same list as Categorize in Outlook calendar and mail.'
              : 'Customise colours and labels. Items inherit their category colour.'}
          </p>
          <div className="px-4 pb-4">
            <CategoriesManager
              categories={categories}
              itemCounts={itemCounts}
              onSave={onSaveCategory}
              onDelete={onDeleteCategory}
              outlookSynced={usingRealMicrosoft}
            />
          </div>
        </div>

        <p className="border-t border-wf-border/50 px-4 pb-2 pt-3 text-subhead font-semibold text-wf-text-secondary">
          To Do on calendar
        </p>
        <SettingsSelectRow
          label="Tasks on diary"
          description={
            DIARY_TASKS_MODE_DESCRIPTIONS[calendarPreferences.diaryTasksMode ?? 'category-rules']
          }
          value={calendarPreferences.diaryTasksMode ?? 'category-rules'}
          options={DIARY_TASKS_MODE_OPTIONS.map((mode) => ({
            value: mode,
            label: DIARY_TASKS_MODE_LABELS[mode],
          }))}
          onChange={(diaryTasksMode) =>
            onCalendarPreferencesChange({ ...calendarPreferences, diaryTasksMode })
          }
        />
        <p className="px-4 pb-2 text-caption text-wf-text-tertiary">
          {usingRealMicrosoft || usingRealGoogle || usingRealApple
            ? 'Connected task lists sync with your provider. Edits in MyAxis or in the provider app stay in sync on refresh.'
            : DIARY_SETTINGS.categoryTableIntro}
        </p>
        {usingRealMicrosoft && (
          <SettingsToggleRow
            label={`${TASK_PROVIDER_LABELS.microsoft} on calendar`}
            description={TASK_PROVIDER_CALENDAR_TOGGLE_DESCRIPTIONS.microsoft}
            checked={calendarSourcePrefs.showMicrosoftTodoTasks}
            disabled={(calendarPreferences.diaryTasksMode ?? 'category-rules') !== 'category-rules'}
            onChange={(showMicrosoftTodoTasks) =>
              onCalendarSourcePrefsChange({ ...calendarSourcePrefs, showMicrosoftTodoTasks })
            }
          />
        )}
        {usingRealGoogle && (
          <SettingsInfoCallout
            title={TASK_PROVIDER_LABELS.google}
            body="Google Calendar events sync today. Google Tasks support is planned — tasks will appear here when connected."
          />
        )}
        {usingRealApple && (
          <SettingsInfoCallout
            title={TASK_PROVIDER_LABELS.apple}
            body="iCloud Calendar events sync today. iCloud Reminders support is planned — reminders will appear here when connected."
          />
        )}
        {!usingRealMicrosoft &&
          !usingRealGoogle &&
          !usingRealApple &&
          categories
            .filter((cat) => cat.kind === 'task' || cat.kind === 'reminder')
            .map((cat) => (
              <SettingsToggleRow
                key={cat.id}
                label={cat.name}
                description={categoryDiaryStatusLabel(cat, calendarPreferences)}
                checked={cat.showInDiary ?? false}
                disabled={(calendarPreferences.diaryTasksMode ?? 'category-rules') !== 'category-rules'}
                onChange={(showInDiary) => onSaveCategory({ ...cat, showInDiary })}
              />
            ))}

        <SettingsCollapsibleSection
          sectionId="calendar-help"
          title="Help & examples"
          summary="Diary setup tips and FAQ"
          open={sectionOpen('calendar-help')}
          onOpenChange={(open) => setSectionOpen('calendar-help', open)}
        >
          <SettingsInfoCallout title={DIARY_SETTINGS.openingTitle} body={DIARY_SETTINGS.openingBody} />
          <SettingsInfoCallout
            bullets={DIARY_SETTINGS.howItWorks.map(
              (entry) => `${entry.label} — ${entry.text}`,
            )}
          />
          <DiaryPreviewPanel
            categories={categories}
            calendarPreferences={calendarPreferences}
            calendarSourcePrefs={calendarSourcePrefs}
            usingRealMicrosoft={usingRealMicrosoft}
            displayOptions={itemDisplayOptions}
          />
          <SettingsInfoCallout title="Example setups">
            <div className="mt-2 space-y-2">
              {DIARY_SETTINGS.examplePresets.map((row) => (
                <div key={row.name} className="flex gap-2 text-caption">
                  <span className="min-w-[7rem] font-medium text-wf-text">{row.name}</span>
                  <span className="shrink-0 font-semibold text-wf-accent">{row.suggested}</span>
                  <span className="text-wf-text-tertiary">— {row.why}</span>
                </div>
              ))}
            </div>
          </SettingsInfoCallout>
          <SettingsInfoCallout title="Reminders vs linked tasks">
            <div className="mt-2 space-y-3">
              {DIARY_SETTINGS.faq.map((entry) => (
                <div key={entry.q}>
                  <p className="font-semibold text-wf-text">{entry.q}</p>
                  <p className="mt-0.5">{entry.a}</p>
                </div>
              ))}
            </div>
          </SettingsInfoCallout>
          <div className="px-4 pb-4">
            <a href="#settings-event-categories" className="text-caption font-semibold text-wf-accent">
              Manage event categories →
            </a>
          </div>
        </SettingsCollapsibleSection>
      </SettingsCollapsibleGroup>

      <SettingsCollapsibleGroup
        sectionId="display"
        title="Display"
        summary={displaySummary}
        open={sectionOpen('display')}
        onOpenChange={(open) => setSectionOpen('display', open)}
      >
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

        <p className="border-t border-wf-border/50 px-4 pb-3 pt-3 text-caption text-wf-text-tertiary">
          How events and tasks look in week board, lists, To Do, and today.
        </p>
        <div className="mx-4 mb-4 rounded-2xl border border-wf-border bg-wf-bg p-2">
          {itemDisplayOptions.multiDayAllDayLayout === 'span-bar' &&
            previewSpanSegments.length > 0 && (
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
            .filter(
              (item) =>
                item.id !== 'preview-multiday' ||
                itemDisplayOptions.multiDayAllDayLayout === 'repeat-daily',
            )
            .map((item) => (
              <CalendarItemRow
                key={item.id}
                item={item}
                categories={categories}
                displayOptions={itemDisplayOptions}
                spanPosition={
                  item.id === 'preview-multiday' &&
                  itemDisplayOptions.multiDayAllDayLayout === 'repeat-daily'
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

        <SettingsCollapsibleSection
          sectionId="display-advanced"
          title="Advanced appearance"
          summary="Density, colours, badges"
          open={sectionOpen('display-advanced')}
          onOpenChange={(open) => setSectionOpen('display-advanced', open)}
        >
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
            options={ITEM_TITLE_SIZE_OPTIONS.map((key) => ({
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
        </SettingsCollapsibleSection>

        <div id="settings-today-highlight" className="border-t border-wf-border/50">
          <p className="px-4 pb-2 pt-3 text-subhead font-semibold text-wf-text-secondary">
            Finding today
          </p>
          <TodayHighlightSettingsPanel
            options={todayHighlight}
            onChange={onTodayHighlightChange}
          />
        </div>
      </SettingsCollapsibleGroup>

      <SettingsCollapsibleGroup
        sectionId="household"
        title="Household"
        summary={householdSummary}
        open={sectionOpen('household')}
        onOpenChange={(open) => setSectionOpen('household', open)}
      >
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
          onClick={onShowPermissions}
          className="mx-4 mb-4 mt-2 w-[calc(100%-2rem)] rounded-xl bg-wf-accent-soft py-2.5 text-body font-semibold text-wf-accent"
        >
          Household permissions
        </button>

        <p className="border-t border-wf-border/50 px-4 pb-2 pt-3 text-subhead font-semibold text-wf-text-secondary">
          Family board
        </p>
        <p className="px-4 pb-2 text-caption text-wf-text-tertiary">
          Corky-style noticeboard for shared household items. Share events from the item editor or
          email view.
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
                onKioskPinChange(next)
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
      </SettingsCollapsibleGroup>

      <SettingsCollapsibleGroup
        sectionId="about"
        title="About"
        summary={aboutSummary}
        open={sectionOpen('about')}
        onOpenChange={(open) => setSectionOpen('about', open)}
      >
        <SettingsRow label="Version" value="0.1.0 prototype" />
        <SettingsRow label="App" value={APP_NAME} />
      </SettingsCollapsibleGroup>
    </>
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
