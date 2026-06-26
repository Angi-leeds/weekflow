import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { CreateLinkInput, EntityType, ItemLink } from '../shared/links'
import type { ItemShare, UpsertItemShareInput } from '../shared/itemShares'
import type { BoardPin } from '../shared/boardPins'
import type { SharedBoardItem } from '../shared/boardPins'
import type { Attachment } from '../shared/attachments'
import type { AppSection, CalendarItem, CalendarViewMode, Category, Contact, EmailMessage, CalendarFilter, CalendarPreferences, IntegrationAccountDefaults, IntegrationPreferences, Note, EmailFolder, SaveItemOptions } from './types'
import { type ListDisplayOptions, type ItemDisplayOptions } from './types'
import { memberCan } from '../shared/householdPermissions'
import { initialEmails, getMockCloudFolder, calendarAccountForCategory } from './mockData'
import { addWeeks, addDays, generateId, parseDate, startOfWeek, toISODate, getDefaultWeekViewStart } from './dateUtils'
import type { EmailActionFlowOptions } from '../shared/emailActionFlow'
import { createLink, fetchAllLinks, removeLink } from './lib/links'
import { fetchAllItemShares, getShareForEntity, upsertItemShare } from './lib/itemShares'
import { createBoardPin, fetchAllBoardPins, getPinForItem, updateBoardPin } from './lib/boardPins'
import { resolveSharedBoardItems } from './lib/boardItemHelpers'
import { fetchAllAttachments } from './lib/attachments'
import { loadCalendarFilter, saveCalendarFilter, sanitizeCalendarFilter } from './lib/calendarSettings'
import {
  clampDateToMonth,
  initialFocusDate,
  loadCalendarNavigation,
  normalizeCalendarDate,
  saveCalendarNavigation,
  todayCalendarDate,
} from './lib/calendarNavigation'
import {
  loadCalendarPreferences,
  loadIntegrationAccountDefaults,
  loadIntegrationPreferences,
  loadItemDisplayOptions,
  loadListOptions,
  loadSettingsPanelPreferences,
  saveCalendarPreferences,
  saveIntegrationAccountDefaults,
  saveIntegrationPreferences,
  saveItemDisplayOptions,
  saveListOptions,
  saveSettingsPanelPreferences,
} from './lib/appSettings'
import {
  getActiveMember,
  loadHouseholdPermissions,
  saveHouseholdPermissions,
  type HouseholdPermissionsConfig,
} from './lib/householdPermissions'
import { calendarFilterMatchesItem } from './components/CalendarAccountFilter'
import {
  createMicrosoftNote,
  deleteMicrosoftNote,
  fetchAllMicrosoftCalendar,
  fetchAllMicrosoftCalendarsList,
  fetchAllMicrosoftContacts,
  createMicrosoftContact,
  updateMicrosoftContact,
  deleteMicrosoftContact,
  fetchAllMicrosoftMail,
  fetchAllMicrosoftTodoListsAndTasks,
  fetchMicrosoftMail,
  fetchMicrosoftNotes,
  fetchMicrosoftStatus,
  mergeGraphCalendar,
  mergeGraphMail,
  mergeGraphNotes,
  microsoftAccountKey,
  replyMicrosoftMail,
  sendMicrosoftMail,
  deleteMicrosoftMail,
  forwardMicrosoftMail,
  moveMicrosoftMail,
  saveMicrosoftMailDraft,
  searchMicrosoftMail,
  updateMicrosoftMailReadState,
  copyEmailToOneDriveFolder,
  updateMicrosoftNote,
} from './lib/microsoft'
import {
  deleteItemFromProvider,
  findCalendarItemById,
  isGraphSourcedItem,
  syncItemToProvider,
  toggleTaskCompleteOnProvider,
} from './lib/graphMutations'
import {
  copyEmailToGoogleDriveFolder,
  deleteGoogleMail,
  fetchAllGoogleCalendar,
  fetchAllGoogleCalendarsList,
  fetchAllGoogleMail,
  fetchGoogleMail,
  fetchGoogleStatus,
  googleAccountKey,
  replyGoogleMail,
  sendGoogleMail,
  syncCalendarToGoogle,
} from './lib/google'
import {
  fetchAllAppleCalendar,
  fetchAppleStatus,
} from './lib/apple'
import { mergeGraphContacts } from './lib/mergeContacts'
import {
  resolveConnectedAccountId,
  resolveDefaultComposeAccountId,
  resolveGoogleConnectedAccountId,
} from './lib/integrationDefaults'
import {
  INITIAL_CONTACTS,
  loadStoredContacts,
  saveStoredContacts,
  loadContactOverlays,
  saveContactOverlays,
  applyContactOverlays,
} from './lib/contacts'
import { duplicateCalendarItem } from './lib/calendarItemHelpers'
import { CalendarMenuProvider, type CalendarMenuActions } from './context/CalendarMenuContext'
import { CalendarLinksProvider } from './context/CalendarLinksContext'
import { filterItemsForDiary } from './lib/diaryVisibility'
import { normalizeItemSchedule } from './lib/itemTimeHelpers'
import { PLANNER_DIARY_HINT } from './lib/diaryHelpCopy'
import { loadStoredItems, saveStoredItems, defaultItems } from './lib/items'
import {
  INITIAL_NOTES,
  createLocalNote,
  loadStoredNotes,
  saveStoredNotes,
} from './lib/notes'
import {
  isMockCalendarItem,
  isMockEmail,
  isMockNote,
  isGoogleEmail,
  isMicrosoftEmail,
  resolveCalendarAccounts,
  resolveEmailAccounts,
  resolveEmailFolders,
  useRealAppleData,
  useRealGoogleData,
  useRealMicrosoftData,
} from './lib/connectedAccounts'
import type { MicrosoftIntegrationStatus } from '../shared/microsoftGraph'
import type { GoogleIntegrationStatus } from '../shared/googleApi'
import type { AppleIntegrationStatus } from '../shared/appleApi'
import type { GoogleCalendarDto } from '../shared/googleApi'
import type { GraphCalendarDto, GraphTodoListDto } from '../shared/microsoftGraph'
import { getItemLinkType } from './lib/itemLinkHelpers'
import {
  DEFAULT_CATEGORIES,
  generateCategoryId,
  loadStoredCategories,
  migrateCategories,
  saveStoredCategories,
} from './categories'
import { BottomNav } from './components/BottomNav'
import { CalendarNav } from './components/CalendarNav'
import type { PrimaryCalendarTab } from './components/ui/ViewsMenu'
import { WeekView } from './components/WeekView'
import { TodayView } from './components/TodayView'
import { MonthView } from './components/MonthView'
import { DayView } from './components/DayView'
import { AgendaView } from './components/AgendaView'
import { YearView } from './components/YearView'
import { ItemFormModal } from './components/ItemFormModal'
import { EmailView } from './components/EmailView'
import { EmailComposeModal, type EmailComposeMode } from './components/EmailComposeModal'
import { LinkExistingModal } from './components/LinkExistingModal'
import { PlannerView } from './components/PlannerView'
import { ContactsView } from './components/ContactsView'
import { NotesView } from './components/NotesView'
import { SettingsView } from './components/SettingsView'
import { SettingsPanel } from './components/SettingsPanel'
import { SuperAdminView } from './components/SuperAdminView'
import { useAuth } from './context/AuthContext'
import { BoardSplitView } from './components/BoardSplitView'
import { FamilyBoardView } from './components/FamilyBoardView'
import { EmailActionFlowModal } from './components/EmailActionFlowModal'
import { Toast } from './components/Toast'
import { KioskPinGate } from './components/KioskPinGate'

export default function App() {
  const { user, config, logout, setUser } = useAuth()
  const [section, setSection] = useState<AppSection>('calendar')
  const [categories, setCategories] = useState<Category[]>(() =>
    migrateCategories(loadStoredCategories() ?? DEFAULT_CATEGORIES),
  )
  const [items, setItems] = useState<CalendarItem[]>(() => loadStoredItems() ?? defaultItems())
  const [emails, setEmails] = useState(initialEmails)
  const [contacts, setContacts] = useState<Contact[]>(
    () => loadStoredContacts() ?? INITIAL_CONTACTS,
  )
  const [contactOverlays, setContactOverlays] = useState<
    Record<string, import('./lib/contacts').ContactOverlay>
  >(() => loadContactOverlays())
  const [notes, setNotes] = useState<Note[]>(
    () => loadStoredNotes() ?? INITIAL_NOTES,
  )
  const [emailSearchQuery, setEmailSearchQuery] = useState<string | null>(null)
  const [calendarPreferences, setCalendarPreferences] = useState(() => loadCalendarPreferences())
  const [focusDate, setFocusDate] = useState(() => initialFocusDate())
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(initialFocusDate(), loadCalendarPreferences().weekStartsOn),
  )
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    const nav = loadCalendarNavigation()
    return nav?.viewMode ?? loadCalendarPreferences().defaultView
  })
  const [weekViewScrollDate, setWeekViewScrollDate] = useState<Date | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null)
  const [listOptions, setListOptions] = useState<ListDisplayOptions>(() => loadListOptions())
  const [itemDisplayOptions, setItemDisplayOptions] = useState<ItemDisplayOptions>(() =>
    loadItemDisplayOptions(),
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(
    () => loadSettingsPanelPreferences().expanded,
  )
  const [integrationPreferences, setIntegrationPreferences] = useState(() =>
    loadIntegrationPreferences(),
  )
  const [integrationAccountDefaults, setIntegrationAccountDefaults] = useState(
    () => loadIntegrationAccountDefaults(),
  )
  const [links, setLinks] = useState<ItemLink[]>([])
  const [itemShares, setItemShares] = useState<ItemShare[]>([])
  const [boardPins, setBoardPins] = useState<BoardPin[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [kioskMode, setKioskMode] = useState(false)
  const [kioskPinGateOpen, setKioskPinGateOpen] = useState(false)
  const [emailSelectedId, setEmailSelectedId] = useState<string | null>(null)
  const [noteSelectedId, setNoteSelectedId] = useState<string | null>(null)
  const [linkPicker, setLinkPicker] = useState<{
    sourceType: EntityType
    sourceId: string
    sourceLabel: string
  } | null>(null)
  const [emailActionFlowEmail, setEmailActionFlowEmail] = useState<EmailMessage | null>(null)
  const [emailCompose, setEmailCompose] = useState<{
    mode: EmailComposeMode
    replyTo?: EmailMessage
  } | null>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [clipboardItem, setClipboardItem] = useState<CalendarItem | null>(null)
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>(() => loadCalendarFilter())
  const [permissionsConfig, setPermissionsConfig] = useState<HouseholdPermissionsConfig>(() =>
    loadHouseholdPermissions(),
  )
  const [microsoftStatus, setMicrosoftStatus] = useState<MicrosoftIntegrationStatus | null>(null)
  const [microsoftLoading, setMicrosoftLoading] = useState(true)
  const [googleStatus, setGoogleStatus] = useState<GoogleIntegrationStatus | null>(null)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [appleStatus, setAppleStatus] = useState<AppleIntegrationStatus | null>(null)
  const [appleLoading, setAppleLoading] = useState(true)
  const [graphEmails, setGraphEmails] = useState<EmailMessage[]>([])
  const [graphEmailFolders, setGraphEmailFolders] = useState<EmailFolder[]>([])
  const [graphCalendarItems, setGraphCalendarItems] = useState<CalendarItem[]>([])
  const [graphNotes, setGraphNotes] = useState<Note[]>([])
  const [graphContacts, setGraphContacts] = useState<Contact[]>([])
  const [graphCalendars, setGraphCalendars] = useState<GraphCalendarDto[]>([])
  const [graphGoogleCalendars, setGraphGoogleCalendars] = useState<GoogleCalendarDto[]>([])
  const [graphTodoLists, setGraphTodoLists] = useState<GraphTodoListDto[]>([])
  const [loadingEmailFolders, setLoadingEmailFolders] = useState<Set<string>>(() => new Set())
  const [notesLoading, setNotesLoading] = useState(false)
  const notesLoadedRef = useRef(false)

  const usingRealMicrosoft = useRealMicrosoftData(microsoftStatus, microsoftLoading)
  const usingRealGoogle = useRealGoogleData(googleStatus, googleLoading)
  const usingRealApple = useRealAppleData(appleStatus, appleLoading)
  const usingRealIntegrations = usingRealMicrosoft || usingRealGoogle || usingRealApple
  const emailAccounts = useMemo(
    () => resolveEmailAccounts(microsoftStatus, googleStatus, appleStatus),
    [microsoftStatus, googleStatus, appleStatus],
  )
  const calendarAccounts = useMemo(
    () => resolveCalendarAccounts(microsoftStatus, googleStatus, appleStatus),
    [microsoftStatus, googleStatus, appleStatus],
  )
  const emailFolders = useMemo(
    () => resolveEmailFolders(emailAccounts, graphEmailFolders),
    [emailAccounts, graphEmailFolders],
  )

  const refreshMicrosoft = useCallback(async () => {
    setMicrosoftLoading(true)
    notesLoadedRef.current = false
    try {
      const status = await fetchMicrosoftStatus()
      setMicrosoftStatus(status)
      const accounts = status.accounts
      if (accounts.length === 0) {
        setGraphEmailFolders((prev) => prev.filter((folder) => !folder.accountId.startsWith('ms-')))
        setGraphEmails((prev) => prev.filter((email) => email.provider !== 'microsoft'))
        setGraphCalendarItems((prev) => prev.filter((item) => item.provider !== 'microsoft'))
        setGraphNotes([])
        setGraphContacts([])
        setGraphCalendars([])
        setGraphTodoLists([])
        return
      }

      console.info('[MyAxis] Loading Microsoft calendar and tasks…')

      const settle = async <T,>(promise: Promise<T>): Promise<PromiseSettledResult<T>> => {
        try {
          return { status: 'fulfilled', value: await promise }
        } catch (reason) {
          return { status: 'rejected', reason }
        }
      }

      const logRejected = (label: string, result: PromiseSettledResult<unknown>) => {
        if (result.status === 'rejected') console.error(label, result.reason)
      }

      const applyMicrosoftItems = (calendar: CalendarItem[], todoTasks: CalendarItem[]) => {
        setGraphCalendarItems((prev) => {
          const other = prev.filter((item) => item.provider !== 'microsoft')
          return mergeGraphCalendar([], [...calendar, ...todoTasks, ...other])
        })
      }

      // Default calendar + To Do first — show planner quickly.
      const [quickCalendarResult, todoBundleResult] = await Promise.all([
        settle(fetchAllMicrosoftCalendar(accounts, { defaultOnly: true })),
        settle(fetchAllMicrosoftTodoListsAndTasks(accounts)),
      ])

      if (quickCalendarResult.status === 'fulfilled') {
        const todoTasks =
          todoBundleResult.status === 'fulfilled' ? todoBundleResult.value.tasks : []
        applyMicrosoftItems(quickCalendarResult.value, todoTasks)
      } else {
        logRejected('Microsoft quick calendar', quickCalendarResult)
      }

      if (todoBundleResult.status === 'fulfilled') {
        setGraphTodoLists(todoBundleResult.value.lists)
      } else {
        logRejected('Microsoft todo bundle', todoBundleResult)
      }

      setMicrosoftLoading(false)
      console.info('[MyAxis] Calendar and tasks ready — loading mail and contacts in background')

      // Full calendar list + all events continue without blocking the UI.
      const [calendarsResult, calendarResult] = await Promise.all([
        settle(fetchAllMicrosoftCalendarsList(accounts)),
        settle(fetchAllMicrosoftCalendar(accounts)),
      ])

      logRejected('Microsoft calendars', calendarsResult)
      logRejected('Microsoft calendar events', calendarResult)

      if (calendarResult.status === 'fulfilled') {
        const todoTasks =
          todoBundleResult.status === 'fulfilled' ? todoBundleResult.value.tasks : []
        applyMicrosoftItems(calendarResult.value, todoTasks)
      }
      if (calendarsResult.status === 'fulfilled') {
        setGraphCalendars(calendarsResult.value)
      }

      // Mail and contacts in the background (notes load when Notes tab opens).
      const [mailResult, contactsResult] = await Promise.all([
        settle(fetchAllMicrosoftMail(accounts)),
        settle(fetchAllMicrosoftContacts(accounts)),
      ])

      logRejected('Microsoft mail', mailResult)
      logRejected('Microsoft contacts', contactsResult)

      if (mailResult.status === 'fulfilled') {
        const mailBundle = mailResult.value
        setGraphEmailFolders((prev) => {
          const other = prev.filter((folder) => !folder.accountId.startsWith('ms-'))
          return [...mailBundle.folders, ...other]
        })
        setGraphEmails((prev) => {
          const other = prev.filter((email) => email.provider !== 'microsoft')
          return mergeGraphMail([], [...mailBundle.mail, ...other])
        })
      }
      if (contactsResult.status === 'fulfilled') {
        setGraphContacts(contactsResult.value)
      }
      console.info('[MyAxis] Microsoft mail and contacts loaded')
    } catch (error) {
      console.error(error)
    } finally {
      setMicrosoftLoading(false)
    }
  }, [])

  const refreshMicrosoftNotes = useCallback(async () => {
    const accounts = microsoftStatus?.accounts ?? []
    if (accounts.length === 0) return

    setNotesLoading(true)
    try {
      console.info('[MyAxis] Loading OneNote pages…')
      const batches = await Promise.all(accounts.map((account) => fetchMicrosoftNotes(account.id)))
      setGraphNotes((prev) => {
        const other = prev.filter((note) => note.provider !== 'microsoft')
        return [...other, ...batches.flat()]
      })
      notesLoadedRef.current = true
      console.info('[MyAxis] OneNote pages loaded')
    } catch (error) {
      console.error('[MyAxis] OneNote load failed', error)
    } finally {
      setNotesLoading(false)
    }
  }, [microsoftStatus?.accounts])

  useEffect(() => {
    if (section !== 'notes') return
    if (!microsoftStatus?.connected || notesLoadedRef.current || notesLoading) return
    void refreshMicrosoftNotes()
  }, [section, microsoftStatus?.connected, notesLoading, refreshMicrosoftNotes])

  const refreshGoogle = useCallback(async () => {
    setGoogleLoading(true)
    try {
      const status = await fetchGoogleStatus()
      setGoogleStatus(status)
      if (status.accounts.length > 0) {
        const [mailBundle, calendar, googleCalendars] = await Promise.all([
          fetchAllGoogleMail(status.accounts),
          fetchAllGoogleCalendar(status.accounts),
          fetchAllGoogleCalendarsList(status.accounts),
        ])
        setGraphEmailFolders((prev) => {
          const other = prev.filter((folder) => !folder.accountId.startsWith('google-'))
          return [...other, ...mailBundle.folders]
        })
        setGraphEmails((prev) => {
          const other = prev.filter((email) => email.provider !== 'google')
          return mergeGraphMail([], [...other, ...mailBundle.mail])
        })
        setGraphCalendarItems((prev) => {
          const other = prev.filter((item) => item.provider !== 'google')
          return mergeGraphCalendar([], [...other, ...calendar])
        })
        setGraphGoogleCalendars(googleCalendars)
      } else {
        setGraphEmailFolders((prev) => prev.filter((folder) => !folder.accountId.startsWith('google-')))
        setGraphEmails((prev) => prev.filter((email) => email.provider !== 'google'))
        setGraphCalendarItems((prev) => prev.filter((item) => item.provider !== 'google'))
        setGraphGoogleCalendars([])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setGoogleLoading(false)
    }
  }, [])

  const refreshApple = useCallback(async () => {
    setAppleLoading(true)
    try {
      const status = await fetchAppleStatus()
      setAppleStatus(status)
      if (status.accounts.length > 0) {
        const calendar = await fetchAllAppleCalendar(status.accounts)
        setGraphCalendarItems((prev) => {
          const other = prev.filter((item) => item.provider !== 'apple')
          return mergeGraphCalendar([], [...other, ...calendar])
        })
      } else {
        setGraphCalendarItems((prev) => prev.filter((item) => item.provider !== 'apple'))
      }
    } catch (error) {
      console.error(error)
    } finally {
      setAppleLoading(false)
    }
  }, [])

  const handleLoadFolderMessages = useCallback(
    async (folder: EmailFolder) => {
      if (!folder.connectedAccountId || !folder.graphFolderId) return
      if (graphEmails.some((email) => email.folderId === folder.id)) return

      setLoadingEmailFolders((prev) => new Set(prev).add(folder.id))
      try {
        const isGoogle = folder.accountId.startsWith('google-')
        const messages = isGoogle
          ? await fetchGoogleMail(folder.connectedAccountId, folder.graphFolderId)
          : await fetchMicrosoftMail(folder.connectedAccountId, folder.graphFolderId)
        setGraphEmails((prev) => [
          ...prev.filter((email) => email.folderId !== folder.id),
          ...messages,
        ])
      } catch (error) {
        console.error(error)
        setToastMessage(
          error instanceof Error ? error.message : `Failed to load ${folder.label}`,
        )
      } finally {
        setLoadingEmailFolders((prev) => {
          const next = new Set(prev)
          next.delete(folder.id)
          return next
        })
      }
    },
    [graphEmails],
  )

  const displayEmails = useMemo(
    () => mergeGraphMail(emails, graphEmails),
    [emails, graphEmails],
  )

  const displayCalendarItems = useMemo(
    () => mergeGraphCalendar(items, graphCalendarItems),
    [items, graphCalendarItems],
  )

  const displayCalendarItemsRef = useRef(displayCalendarItems)
  displayCalendarItemsRef.current = displayCalendarItems

  const displayNotes = useMemo(
    () => mergeGraphNotes(notes, graphNotes),
    [notes, graphNotes],
  )

  const displayContacts = useMemo(
    () => applyContactOverlays(mergeGraphContacts(contacts, graphContacts), contactOverlays),
    [contacts, graphContacts, contactOverlays],
  )

  const outlookAccountEmails = useMemo(() => {
    const map: Record<string, string> = {}
    for (const account of microsoftStatus?.accounts ?? []) {
      map[account.id] = account.email
    }
    for (const account of googleStatus?.accounts ?? []) {
      map[account.id] = account.email
    }
    for (const account of appleStatus?.accounts ?? []) {
      map[account.id] = account.email
    }
    return map
  }, [microsoftStatus, googleStatus, appleStatus])

  const activeMember = useMemo(() => getActiveMember(permissionsConfig), [permissionsConfig])
  const canDismissVoicePins = memberCan(activeMember, permissionsConfig, 'dismissVoicePins')
  const canManageBoardLayout = memberCan(activeMember, permissionsConfig, 'manageBoardLayout')

  const diaryVisibleItems = useMemo(
    () => filterItemsForDiary(displayCalendarItems, categories, calendarPreferences),
    [displayCalendarItems, categories, calendarPreferences],
  )

  const calendarItems = useMemo(() => {
    if (calendarFilter.mode === 'merged') return diaryVisibleItems
    return diaryVisibleItems.filter((item) =>
      calendarFilterMatchesItem(calendarFilter, item.accountId),
    )
  }, [diaryVisibleItems, calendarFilter])

  useEffect(() => {
    const accountIds = calendarAccounts.map((account) => account.id)
    setCalendarFilter((prev) => sanitizeCalendarFilter(prev, accountIds))
  }, [calendarAccounts])

  useEffect(() => {
    setItems((prev) => {
      let changed = false
      const next = prev.map((item) => {
        const normalized = normalizeItemSchedule(item, categories)
        if (
          normalized.allDay !== item.allDay ||
          normalized.startTime !== item.startTime ||
          normalized.endTime !== item.endTime
        ) {
          changed = true
        }
        return normalized
      })
      return changed ? next : prev
    })
  }, [categories])

  useEffect(() => {
    if (microsoftLoading && googleLoading) return
    if (!usingRealIntegrations) return

    setEmails((prev) => prev.filter((email) => !isMockEmail(email)))
    setItems((prev) => prev.filter((item) => !isMockCalendarItem(item)))
    setNotes((prev) => prev.filter((note) => !isMockNote(note)))
    setContacts((prev) => prev.filter((contact) => contact.source !== "mock"))
  }, [microsoftLoading, googleLoading, usingRealIntegrations])

  const unreadCount = useMemo(() => displayEmails.filter((e) => e.unread).length, [displayEmails])

  useEffect(() => {
    saveStoredContacts(contacts)
  }, [contacts])

  useEffect(() => {
    saveStoredItems(items)
  }, [items])

  useEffect(() => {
    saveContactOverlays(contactOverlays)
  }, [contactOverlays])

  useEffect(() => {
    saveStoredNotes(notes)
  }, [notes])

  useEffect(() => {
    saveStoredCategories(categories)
  }, [categories])

  useEffect(() => {
    saveCalendarFilter(calendarFilter)
  }, [calendarFilter])

  useEffect(() => {
    saveListOptions(listOptions)
  }, [listOptions])

  useEffect(() => {
    saveItemDisplayOptions(itemDisplayOptions)
  }, [itemDisplayOptions])

  useEffect(() => {
    saveSettingsPanelPreferences({ expanded: settingsExpanded })
  }, [settingsExpanded])

  useEffect(() => {
    saveCalendarPreferences(calendarPreferences)
  }, [calendarPreferences])

  useEffect(() => {
    saveIntegrationPreferences(integrationPreferences)
  }, [integrationPreferences])

  useEffect(() => {
    saveIntegrationAccountDefaults(integrationAccountDefaults)
  }, [integrationAccountDefaults])

  useEffect(() => {
    saveCalendarNavigation({ focusDate: toISODate(focusDate), viewMode })
  }, [focusDate, viewMode])

  useEffect(() => {
    setWeekStart(startOfWeek(focusDate, calendarPreferences.weekStartsOn))
  }, [calendarPreferences.weekStartsOn, focusDate])

  useEffect(() => {
    saveHouseholdPermissions(permissionsConfig)
  }, [permissionsConfig])

  useEffect(() => {
    fetchAllLinks().then(setLinks).catch(console.error)
  }, [])

  useEffect(() => {
    fetchAllItemShares().then(setItemShares).catch(console.error)
  }, [])

  useEffect(() => {
    fetchAllBoardPins().then(setBoardPins).catch(console.error)
  }, [])

  useEffect(() => {
    fetchAllAttachments().then(setAttachments).catch(console.error)
  }, [])

  useEffect(() => {
    void refreshMicrosoft()
    void refreshGoogle()
    void refreshApple()
  }, [refreshMicrosoft, refreshGoogle, refreshApple])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sectionParam = params.get('section')
    if (
      sectionParam === 'calendar' ||
      sectionParam === 'planner' ||
      sectionParam === 'board' ||
      sectionParam === 'email' ||
      sectionParam === 'contacts' ||
      sectionParam === 'notes' ||
      sectionParam === 'today' ||
      sectionParam === 'super-admin'
    ) {
      if (sectionParam === 'super-admin' && !user?.isSuperAdmin) {
        setSettingsOpen(true)
        setSettingsExpanded(true)
      } else {
        setSection(sectionParam)
        if (sectionParam === 'super-admin') {
          setSettingsOpen(false)
        }
      }
    } else if (sectionParam === 'settings') {
      setSettingsOpen(true)
      setSettingsExpanded(true)
    }

    const microsoftResult = params.get('microsoft')
    if (microsoftResult === 'connected') {
      setSettingsOpen(true)
      setSettingsExpanded(true)
      setToastMessage(`Connected ${params.get('email') ?? 'Microsoft account'}`)
      void refreshMicrosoft()
    } else if (microsoftResult === 'error') {
      setSettingsOpen(true)
      setSettingsExpanded(true)
      setToastMessage('Microsoft sign-in failed. Check server OAuth settings.')
    }

    const googleResult = params.get('google')
    if (googleResult === 'connected') {
      setSettingsOpen(true)
      setSettingsExpanded(true)
      setToastMessage(`Connected ${params.get('email') ?? 'Google account'}`)
      void refreshGoogle()
    } else if (googleResult === 'error') {
      setSettingsOpen(true)
      setSettingsExpanded(true)
      setToastMessage('Google sign-in failed. Check server OAuth settings.')
    }

    if (params.has('section') || params.has('microsoft') || params.has('google')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [refreshMicrosoft, refreshGoogle, user?.isSuperAdmin])

  const sharedBoardItems = useMemo(
    () =>
      resolveSharedBoardItems(
        itemShares,
        displayCalendarItems,
        displayEmails,
        categories,
        attachments,
        displayNotes,
      ),
    [itemShares, displayCalendarItems, displayEmails, categories, attachments, displayNotes],
  )

  useEffect(() => {
    let cancelled = false

    async function ensurePinsForSharedItems() {
      for (const item of sharedBoardItems) {
        const pin = await createBoardPin({
          itemType: item.itemType,
          itemId: item.itemId,
        })
        if (cancelled) return
        setBoardPins((prev) => {
          if (getPinForItem(prev, item.itemType, item.itemId)) return prev
          return [...prev, pin]
        })
      }
    }

    void ensurePinsForSharedItems()
    return () => {
      cancelled = true
    }
  }, [sharedBoardItems])

  const upsertLink = useCallback((link: ItemLink) => {
    setLinks((prev) => [...prev.filter((entry) => entry.id !== link.id), link])
  }, [])

  const handleCreateLink = useCallback(
    async (input: CreateLinkInput) => {
      const link = await createLink(input)
      upsertLink(link)
      return link
    },
    [upsertLink],
  )

  const handleRemoveLink = useCallback(async (linkId: string) => {
    await removeLink(linkId)
    setLinks((prev) => prev.filter((link) => link.id !== linkId))
  }, [])

  const handleShareUpdate = useCallback(async (input: UpsertItemShareInput) => {
    const share = await upsertItemShare(input)
    setItemShares((prev) => [
      ...prev.filter(
        (entry) => !(entry.itemType === share.itemType && entry.itemId === share.itemId),
      ),
      share,
    ])
  }, [])

  const mergePinIntoState = useCallback((pin: BoardPin) => {
    setBoardPins((prev) => {
      if (pin.dismissedAt) {
        return prev.filter((entry) => entry.id !== pin.id)
      }
      const idx = prev.findIndex((entry) => entry.id === pin.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = pin
        return next
      }
      return [...prev, pin]
    })
  }, [])

  const handlePinUpdate = useCallback(
    async (pin: BoardPin) => {
      try {
        const updated = await updateBoardPin(pin.id, {
          contentJson: pin.contentJson,
          pinStyle: pin.pinStyle,
          x: pin.x,
          y: pin.y,
          rotation: pin.rotation,
          dismissedAt: pin.dismissedAt,
        })
        mergePinIntoState(updated)
      } catch {
        mergePinIntoState(pin)
      }
    },
    [mergePinIntoState],
  )

  const handleNavigateLink = useCallback(
    (type: EntityType, id: string) => {
      if (type === 'email') {
        setSection('email')
        setEmailSelectedId(id)
        return
      }

      if (type === 'note') {
        setSection('notes')
        setNoteSelectedId(id)
        return
      }

      if (type === 'folder_ref') {
        const link = links.find(
          (entry) =>
            (entry.toType === 'folder_ref' && entry.toId === id) ||
            (entry.fromType === 'folder_ref' && entry.fromId === id),
        )
        const folder = getMockCloudFolder(id)
        const url = link?.folderUrl ?? folder?.url
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer')
        } else {
          setToastMessage('Folder link unavailable.')
        }
        return
      }

      const item = items.find((entry) => entry.id === id)
      if (!item) return

      const linkType = getItemLinkType(item, categories)
      setSection(linkType === 'task' ? 'planner' : 'calendar')
      setEditingItem(item)
      setModalOpen(true)
    },
    [items, categories, links],
  )

  const calendarLinksValue = useMemo(
    () => ({
      links,
      items: displayCalendarItems,
      onNavigateLink: handleNavigateLink,
    }),
    [links, displayCalendarItems, handleNavigateLink],
  )

  const plannerDiaryHint = useMemo(() => {
    if ((calendarPreferences.diaryTasksMode ?? 'category-rules') !== 'category-rules') return undefined
    const hasDiaryList = categories.some(
      (cat) => (cat.kind === 'task' || cat.kind === 'reminder') && cat.showInDiary,
    )
    return hasDiaryList ? undefined : PLANNER_DIARY_HINT
  }, [categories, calendarPreferences.diaryTasksMode])

  const handleSharedBoardItemTap = useCallback(
    (item: SharedBoardItem) => {
      handleNavigateLink(item.itemType as EntityType, item.itemId)
    },
    [handleNavigateLink],
  )

  const resolveEmailConnectedAccountId = useCallback(
    (email: EmailMessage): string | undefined => {
      if (email.connectedAccountId) return email.connectedAccountId
      if (email.accountId?.startsWith('ms-')) return email.accountId.slice(3)
      if (email.accountId?.startsWith('google-')) return email.accountId.slice(7)
      if (isGoogleEmail(email)) return googleStatus?.accounts[0]?.id
      return resolveConnectedAccountId(
        microsoftStatus?.accounts ?? [],
        integrationAccountDefaults,
        email.accountId,
      )
    },
    [integrationAccountDefaults, microsoftStatus, googleStatus],
  )

  const isGoogleConnectedAccount = useCallback(
    (connectedAccountId: string) =>
      (googleStatus?.accounts ?? []).some((account) => account.id === connectedAccountId),
    [googleStatus],
  )

  const handleCreateTaskFromEmail = useCallback(
    async (email: EmailMessage) => {
      const taskCategory = categories.find((c) => c.id === 'task') ?? categories[0]
      const task: CalendarItem = {
        id: generateId(),
        title: email.subject,
        date: toISODate(new Date(email.date)),
        allDay: true,
        categoryId: taskCategory.id,
        colour: taskCategory.colour,
        accountId: email.accountId || calendarAccountForCategory(taskCategory.id),
        notes: `From: ${email.from} <${email.fromEmail}>\n\n${email.body.slice(0, 500)}`,
        completed: false,
      }

      setItems((prev) => [...prev, task])
      await handleCreateLink({
        fromType: 'email',
        fromId: email.id,
        toType: 'task',
        toId: task.id,
        kind: 'created_from',
      })

      setSection('planner')
      setEditingItem(task)
      setModalOpen(true)
    },
    [categories, handleCreateLink],
  )

  const handleEmailActionFlow = useCallback(
    async (email: EmailMessage, options: EmailActionFlowOptions) => {
      const eventCategory =
        categories.find((category) => category.id === 'appointment') ?? categories[0]
      const taskCategory = categories.find((category) => category.id === 'task') ?? categories[0]
      const mockFolder = options.folderId ? getMockCloudFolder(options.folderId) : undefined
      const folder =
        options.folderId && options.folderUrl
          ? {
              id: options.folderId,
              url: options.folderUrl,
              label: options.folderLabel ?? mockFolder?.label ?? 'OneDrive folder',
              provider: options.folderProvider ?? mockFolder?.provider ?? 'OneDrive',
            }
          : mockFolder

      let calendarItem: CalendarItem | null = null
      let taskItem: CalendarItem | null = null

      if (options.createCalendar) {
        calendarItem = {
          id: generateId(),
          title: `Pay: ${email.from}`,
          date: options.dueDate,
          allDay: true,
          categoryId: eventCategory.id,
          colour: eventCategory.colour,
          accountId: email.accountId || calendarAccountForCategory(eventCategory.id),
          notes: `From: ${email.from} <${email.fromEmail}>\n\n${email.body.slice(0, 500)}`,
        }
        setItems((prev) => [...prev, calendarItem!])
        await handleCreateLink({
          fromType: 'email',
          fromId: email.id,
          toType: 'calendar',
          toId: calendarItem.id,
          kind: 'created_from',
        })
      }

      if (options.createTask) {
        const dueDate = parseDate(options.dueDate)
        taskItem = {
          id: generateId(),
          title: `Pay before due: ${email.from}`,
          date: toISODate(addDays(dueDate, -options.taskLeadDays)),
          allDay: true,
          categoryId: taskCategory.id,
          colour: taskCategory.colour,
          accountId: email.accountId || calendarAccountForCategory(taskCategory.id),
          notes: `Reminder linked to bill email: ${email.subject}`,
          completed: false,
        }
        setItems((prev) => [...prev, taskItem!])
        await handleCreateLink({
          fromType: 'email',
          fromId: email.id,
          toType: 'task',
          toId: taskItem.id,
          kind: 'created_from',
        })
        if (calendarItem) {
          await handleCreateLink({
            fromType: 'calendar',
            fromId: calendarItem.id,
            toType: 'task',
            toId: taskItem.id,
            kind: 'follow_up',
          })
        }
      }

      if (options.tagFolder && options.folderId && folder) {
        await handleCreateLink({
          fromType: 'email',
          fromId: email.id,
          toType: 'folder_ref',
          toId: options.folderId,
          kind: 'folder_ref',
          folderUrl: folder.url,
          folderProvider: folder.provider,
        })
        if (calendarItem) {
          await handleCreateLink({
            fromType: 'calendar',
            fromId: calendarItem.id,
            toType: 'folder_ref',
            toId: options.folderId,
            kind: 'folder_ref',
            folderUrl: folder.url,
            folderProvider: folder.provider,
          })
        }
      }

      if (options.shareToBoard && calendarItem) {
        await handleShareUpdate({
          itemType: 'calendar',
          itemId: calendarItem.id,
          sharedToBoard: true,
          boardDisplay: options.boardDisplay,
        })
      }

      if (options.autoCopy) {
        const connectedAccountId = resolveEmailConnectedAccountId(email)
        if (connectedAccountId && folder && options.folderId) {
          if (isMicrosoftEmail(email) && usingRealMicrosoft) {
            try {
              const copied = await copyEmailToOneDriveFolder(connectedAccountId, options.folderId, {
                subject: email.subject,
                from: email.from,
                fromEmail: email.fromEmail,
                date: email.date,
                body: email.body,
              })
              setToastMessage(`Email copied to ${folder.label} (${copied.name})`)
            } catch (error) {
              console.error(error)
              setToastMessage(
                error instanceof Error ? error.message : 'Saved links; OneDrive copy failed',
              )
            }
          } else if (isGoogleEmail(email) && usingRealGoogle) {
            try {
              const copied = await copyEmailToGoogleDriveFolder(connectedAccountId, options.folderId, {
                subject: email.subject,
                from: email.from,
                fromEmail: email.fromEmail,
                date: email.date,
                body: email.body,
              })
              setToastMessage(`Email copied to ${folder.label} (${copied.name})`)
            } catch (error) {
              console.error(error)
              setToastMessage(
                error instanceof Error ? error.message : 'Saved links; Google Drive copy failed',
              )
            }
          }
        } else if (!usingRealMicrosoft && !usingRealGoogle) {
          setToastMessage(
            folder ? `Email copied to ${folder.label} (mock)` : 'Email copied to folder (mock)',
          )
        }
      }

      if (calendarItem) {
        setSection('calendar')
        setEditingItem(calendarItem)
        setModalOpen(true)
      } else if (taskItem) {
        setSection('planner')
        setEditingItem(taskItem)
        setModalOpen(true)
      }
    },
    [categories, handleCreateLink, handleShareUpdate, usingRealMicrosoft, usingRealGoogle, resolveEmailConnectedAccountId],
  )

  const handleLinkExistingSelect = useCallback(
    async (targetType: EntityType, targetId: string) => {
      if (!linkPicker) return

      await handleCreateLink({
        fromType: linkPicker.sourceType,
        fromId: linkPicker.sourceId,
        toType: targetType,
        toId: targetId,
        kind: 'relates_to',
      })
      setLinkPicker(null)
    },
    [linkPicker, handleCreateLink],
  )

  const openLinkPickerForEmail = useCallback((email: EmailMessage) => {
    setLinkPicker({
      sourceType: 'email',
      sourceId: email.id,
      sourceLabel: email.subject,
    })
  }, [])

  const openLinkPickerForItem = useCallback((item: CalendarItem) => {
    setLinkPicker({
      sourceType: getItemLinkType(item, categories),
      sourceId: item.id,
      sourceLabel: item.title,
    })
  }, [categories])

  const handleAttachmentUploaded = useCallback((attachment: Attachment) => {
    setAttachments((prev) => [
      ...prev.filter(
        (entry) =>
          !(
            entry.itemType === attachment.itemType &&
            entry.itemId === attachment.itemId &&
            entry.kind === attachment.kind
          ),
      ),
      attachment,
    ])
  }, [])

  const handleSaveCategory = useCallback((incoming: Category) => {
    const savedId = incoming.id

    setCategories((prev) => {
      if (incoming.id) {
        const idx = prev.findIndex((c) => c.id === incoming.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...incoming, isDefault: prev[idx].isDefault }
          return next
        }
      }
      const id = generateCategoryId(incoming.name, prev)
      return [...prev, { ...incoming, id }]
    })

    if (savedId) {
      setItems((prev) =>
        prev.map((item) =>
          item.categoryId === savedId ? { ...item, colour: incoming.colour } : item,
        ),
      )
    }
  }, [])

  const handleDeleteCategory = useCallback((id: string) => {
    const fallbackId = categories.find((c) => c.id === 'work')?.id ?? categories[0]?.id ?? id
    const fallbackColour =
      categories.find((c) => c.id === fallbackId)?.colour ?? '#8E8E93'

    setCategories((prev) => prev.filter((c) => c.id !== id))

    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === id
          ? { ...item, categoryId: fallbackId, colour: fallbackColour }
          : item,
      ),
    )

    setListOptions((opts) => {
      if (!opts.categoryFilter) return opts
      const next = opts.categoryFilter.filter((cid) => cid !== id)
      if (next.length === 0) return { ...opts, categoryFilter: null }
      return { ...opts, categoryFilter: next }
    })
  }, [categories])

  const handleSaveItem = useCallback(
    async (item: CalendarItem, options?: SaveItemOptions) => {
      const microsoftAccounts = microsoftStatus?.accounts ?? []
      const googleAccounts = googleStatus?.accounts ?? []
      const useGoogle =
        item.provider === 'google' || (item.accountId?.startsWith('google-') ?? false)
      const fallbackAccountKey = useGoogle
        ? googleAccounts[0]
          ? googleAccountKey(googleAccounts[0].id)
          : calendarAccountForCategory(item.categoryId)
        : microsoftAccounts[0]
          ? microsoftAccountKey(microsoftAccounts[0].id)
          : calendarAccountForCategory(item.categoryId)
      const normalized = normalizeItemSchedule(
        {
          ...item,
          accountId: item.accountId ?? fallbackAccountKey,
        },
        categories,
      )

      const upsertLocal = (next: CalendarItem) => {
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.id === next.id)
          if (idx >= 0) {
            const copy = [...prev]
            copy[idx] = next
            return copy
          }
          return [...prev, next]
        })
        if (isGraphSourcedItem(next)) {
          setGraphCalendarItems((prev) => {
            const idx = prev.findIndex(
              (entry) =>
                entry.id === next.id ||
                (next.externalId && entry.externalId === next.externalId),
            )
            if (idx >= 0) {
              const copy = [...prev]
              copy[idx] = { ...copy[idx], ...next }
              return copy
            }
            return prev
          })
        }
      }

      upsertLocal(normalized)

      if (options?.createLinkedTask) {
        const taskCategory =
          categories.find((entry) => entry.id === options.createLinkedTask!.categoryId) ??
          categories.find((entry) => entry.kind === 'task') ??
          categories[0]
        const taskItem: CalendarItem = {
          id: generateId(),
          title: `Follow up: ${normalized.title}`,
          date: normalized.date,
          endDate: normalized.endDate,
          startTime: normalized.startTime,
          endTime: normalized.endTime,
          allDay: normalized.allDay,
          categoryId: taskCategory.id,
          colour: taskCategory.colour,
          accountId: normalized.accountId ?? calendarAccountForCategory(taskCategory.id),
          completed: false,
          notes: normalized.notes,
        }
        upsertLocal(taskItem)
        await handleCreateLink({
          fromType: 'calendar',
          fromId: normalized.id,
          toType: 'task',
          toId: taskItem.id,
          kind: 'follow_up',
        })
      }

      if (options?.createLinkedCalendarEvent) {
        const eventCategory =
          categories.find((entry) => entry.id === options.createLinkedCalendarEvent!.categoryId) ??
          categories.find((entry) => entry.id === 'appointment') ??
          categories[0]
        const eventItem: CalendarItem = {
          id: generateId(),
          title: normalized.title,
          date: normalized.date,
          endDate: normalized.endDate,
          startTime: normalized.startTime,
          endTime: normalized.endTime,
          allDay: normalized.allDay,
          categoryId: eventCategory.id,
          colour: eventCategory.colour,
          accountId: normalized.accountId ?? calendarAccountForCategory(eventCategory.id),
          reminderPreset: normalized.reminderPreset,
          reminderCustomMinutes: normalized.reminderCustomMinutes,
          reminderAt: normalized.reminderAt,
        }
        upsertLocal(eventItem)
        await handleCreateLink({
          fromType: 'calendar',
          fromId: eventItem.id,
          toType: 'task',
          toId: normalized.id,
          kind: 'follow_up',
        })
      }

      const connectedAccountId = useGoogle
        ? resolveGoogleConnectedAccountId(
            googleAccounts,
            integrationAccountDefaults,
            normalized.accountId,
          )
        : resolveConnectedAccountId(
            microsoftAccounts,
            integrationAccountDefaults,
            normalized.accountId,
          )
      if (!connectedAccountId) return

      const linkType = getItemLinkType(normalized, categories)
      const photoAttachment = attachments.find(
        (entry) =>
          entry.itemType === linkType &&
          entry.itemId === normalized.id &&
          entry.kind === 'photo',
      )

      const defaultCalendarId = useGoogle
        ? normalized.calendarId ?? integrationAccountDefaults.googleCalendar?.defaultCalendarId
        : normalized.calendarId ?? integrationAccountDefaults.calendar?.defaultCalendarId
      const defaultTodoListId = integrationAccountDefaults.tasks?.defaultTodoListId

      try {
        const result = await syncItemToProvider(normalized, categories, {
          connectedAccountId,
          defaultCalendarId,
          defaultTodoListId,
          useGoogle,
          photo: photoAttachment
            ? {
                storageKey: photoAttachment.storageKey,
                mimeType: photoAttachment.mimeType,
                filename: photoAttachment.filename,
              }
            : undefined,
        })

        const synced: CalendarItem = {
          ...normalized,
          externalId: result.externalId,
          provider: useGoogle ? 'google' : 'microsoft',
          connectedAccountId,
          todoListId: result.todoListId ?? normalized.todoListId,
        }
        upsertLocal(synced)

        if (useGoogle) {
          await refreshGoogle()
        } else {
          void refreshMicrosoft()
        }

        const category = categories.find((entry) => entry.id === normalized.categoryId)
        if (category?.kind === 'task') {
          setToastMessage('Task synced to Microsoft To Do')
        } else if (result.photoAttached) {
          setToastMessage('Synced to Outlook calendar with photo')
        } else if (photoAttachment) {
          setToastMessage('Synced to Outlook calendar (photo upload skipped)')
        } else {
          setToastMessage(useGoogle ? 'Synced to Google Calendar' : 'Synced to Outlook calendar')
        }
      } catch (error) {
        console.error(error)
        setToastMessage(
          error instanceof Error ? error.message : 'Saved locally; sync failed',
        )
      }
    },
    [
      attachments,
      categories,
      googleStatus,
      integrationAccountDefaults,
      microsoftStatus,
      refreshGoogle,
      refreshMicrosoft,
      handleCreateLink,
    ],
  )

  const handleDeleteItem = useCallback(
    async (id: string) => {
      const item = findCalendarItemById(
        id,
        items,
        graphCalendarItems,
      ) ?? displayCalendarItemsRef.current.find((entry) => entry.id === id)
      if (!item) return

      const category = categories.find((entry) => entry.id === item.categoryId)
      const isTask = category?.kind === 'task' || item.categoryId === 'task'
      const confirmMessage =
        item.externalId && item.provider === 'microsoft'
          ? isTask
            ? 'Delete this task from Microsoft To Do?'
            : 'Delete this event from Outlook calendar?'
          : 'Delete this item?'
      if (!window.confirm(confirmMessage)) return

      setItems((prev) => prev.filter((i) => i.id !== id))
      setGraphCalendarItems((prev) =>
        prev.filter(
          (entry) =>
            entry.id !== id &&
            !(item.externalId && entry.externalId === item.externalId),
        ),
      )

      if (!item.externalId || !item.connectedAccountId) return

      try {
        await deleteItemFromProvider(item, categories)
        if (item.provider === 'microsoft') {
          void refreshMicrosoft()
        }
        setToastMessage(isTask ? 'Task deleted from To Do' : 'Event deleted from Outlook')
      } catch (error) {
        console.error(error)
        setToastMessage(error instanceof Error ? error.message : 'Failed to delete from Outlook')
      }
    },
    [categories, graphCalendarItems, items, refreshMicrosoft],
  )

  const handleToggleComplete = useCallback(
    async (id: string) => {
      const item = findCalendarItemById(id, items, graphCalendarItems) ??
        displayCalendarItemsRef.current.find((entry) => entry.id === id)
      if (!item) return

      const nextCompleted = !item.completed
      const applyComplete = (entry: CalendarItem): CalendarItem =>
        entry.id === id || (item.externalId && entry.externalId === item.externalId)
          ? { ...entry, completed: nextCompleted }
          : entry

      setItems((prev) => prev.map(applyComplete))
      setGraphCalendarItems((prev) => prev.map(applyComplete))

      if (!item.externalId || !item.connectedAccountId || item.provider !== 'microsoft') return

      try {
        await toggleTaskCompleteOnProvider(
          { ...item, completed: nextCompleted },
          categories,
          nextCompleted,
        )
      } catch (error) {
        console.error(error)
        setToastMessage(error instanceof Error ? error.message : 'Failed to sync task completion')
        setItems((prev) => prev.map((entry) => (entry.id === id ? item : entry)))
        setGraphCalendarItems((prev) =>
          prev.map((entry) =>
            entry.id === id || (item.externalId && entry.externalId === item.externalId)
              ? item
              : entry,
          ),
        )
      }
    },
    [categories, graphCalendarItems, items],
  )

  const openAddModal = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const openEditModal = (item: CalendarItem) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleCopyItem = useCallback((item: CalendarItem) => {
    setClipboardItem(item)
    setToastMessage('Copied — right-click a day to paste')
  }, [])

  const handlePasteToDay = useCallback(
    (date: Date) => {
      if (!clipboardItem) return
      void handleSaveItem(duplicateCalendarItem(clipboardItem, date))
    },
    [clipboardItem, handleSaveItem],
  )

  const handleDuplicateItem = useCallback(
    (item: CalendarItem, targetDate: Date) => {
      void handleSaveItem(duplicateCalendarItem(item, targetDate))
    },
    [handleSaveItem],
  )

  const handleNewEventOnDay = useCallback((date: Date) => {
    setFocusDate(normalizeCalendarDate(date))
    setEditingItem(null)
    setModalOpen(true)
  }, [])

  const handleFocusDateFromWeek = useCallback((date: Date) => {
    setFocusDate(normalizeCalendarDate(date))
  }, [])

  const handleMonthFocusChange = useCallback((month: Date) => {
    setFocusDate((prev) => clampDateToMonth(prev, month))
  }, [])

  const handleSaveContact = useCallback(
    async (contact: Contact) => {
      if (contact.source === 'microsoft' && contact.externalId && contact.connectedAccountId) {
        try {
          await updateMicrosoftContact(
            contact.connectedAccountId,
            contact.externalId,
            contact,
          )
          setGraphContacts((prev) =>
            prev.map((entry) => (entry.id === contact.id ? contact : entry)),
          )
          setToastMessage('Contact updated in Outlook')
        } catch (error) {
          console.error(error)
          setContactOverlays((prev) => ({
            ...prev,
            [contact.externalId!]: {
              ...prev[contact.externalId!],
              notes: contact.notes,
              starred: contact.starred,
            },
          }))
          setToastMessage(
            error instanceof Error ? error.message : 'Saved notes locally; Outlook sync failed',
          )
        }
        return
      }

      if (usingRealMicrosoft && contact.source !== 'microsoft') {
        const account = microsoftStatus?.accounts[0]
        if (account) {
          try {
            const result = await createMicrosoftContact(account.id, contact)
            await refreshMicrosoft()
            setToastMessage('Contact saved to Outlook')
            return
          } catch (error) {
            console.error(error)
            setToastMessage(
              error instanceof Error ? error.message : 'Saved locally; Outlook sync failed',
            )
          }
        }
      }

      setContacts((prev) => {
        const index = prev.findIndex((entry) => entry.id === contact.id)
        if (index >= 0) {
          const next = [...prev]
          next[index] = contact
          return next
        }
        return [...prev, contact]
      })
    },
    [microsoftStatus, refreshMicrosoft, usingRealMicrosoft],
  )

  const handleDeleteContact = useCallback(
    async (contact: Contact) => {
      if (contact.source === 'microsoft' && contact.externalId && contact.connectedAccountId) {
        if (
          !window.confirm('Delete this contact from Outlook People? This cannot be undone.')
        ) {
          return
        }
        try {
          await deleteMicrosoftContact(contact.connectedAccountId, contact.externalId)
          setGraphContacts((prev) => prev.filter((entry) => entry.id !== contact.id))
          setToastMessage('Contact deleted from Outlook')
          return
        } catch (error) {
          console.error(error)
          setToastMessage(error instanceof Error ? error.message : 'Failed to delete contact')
          return
        }
      }

      setContacts((prev) => prev.filter((entry) => entry.id !== contact.id))
    },
    [],
  )

  const handleToggleContactStar = useCallback((contact: Contact) => {
    if (contact.source === 'microsoft' && contact.externalId) {
      setContactOverlays((prev) => ({
        ...prev,
        [contact.externalId!]: {
          ...prev[contact.externalId!],
          starred: !contact.starred,
        },
      }))
      return
    }

    setContacts((prev) =>
      prev.map((entry) =>
        entry.id === contact.id ? { ...entry, starred: !entry.starred } : entry,
      ),
    )
  }, [])

  const handleOpenEmailFromContact = useCallback((email: EmailMessage) => {
    setEmailSelectedId(email.id)
    setEmailSearchQuery(null)
    setSection('email')
  }, [])

  const handleEmailComposeSend = useCallback(
    async (payload: {
      connectedAccountId: string
      to?: string
      subject?: string
      body: string
      replyToExternalId?: string
      replyAll?: boolean
      forwardToExternalId?: string
      saveAsDraft?: boolean
      draftId?: string
    }) => {
      setEmailSending(true)
      try {
        const useGoogle = isGoogleConnectedAccount(payload.connectedAccountId)
        if (payload.saveAsDraft && !useGoogle) {
          const to = payload.to?.split(/[,;]/).map((entry) => entry.trim()).filter(Boolean) ?? []
          await saveMicrosoftMailDraft(payload.connectedAccountId, {
            to,
            subject: payload.subject ?? '',
            body: payload.body,
            draftId: payload.draftId,
          })
          setEmailCompose(null)
          setToastMessage('Draft saved to Outlook')
          await refreshMicrosoft()
          return
        }

        if (payload.forwardToExternalId && !useGoogle) {
          const to = payload.to?.split(/[,;]/).map((entry) => entry.trim()).filter(Boolean) ?? []
          await forwardMicrosoftMail(payload.connectedAccountId, payload.forwardToExternalId, {
            comment: payload.body,
            to,
          })
        } else if (payload.replyToExternalId) {
          if (useGoogle) {
            await replyGoogleMail(payload.connectedAccountId, payload.replyToExternalId, {
              comment: payload.body,
              replyAll: payload.replyAll,
            })
          } else {
            await replyMicrosoftMail(payload.connectedAccountId, payload.replyToExternalId, {
              comment: payload.body,
              replyAll: payload.replyAll,
            })
          }
        } else if (useGoogle) {
          await sendGoogleMail(payload.connectedAccountId, {
            to: payload.to ?? '',
            subject: payload.subject ?? '',
            body: payload.body,
          })
        } else {
          const signature = integrationAccountDefaults.emailSignature?.trim();
          const body = signature ? `${payload.body}\n\n--\n${signature}` : payload.body;
          await sendMicrosoftMail(payload.connectedAccountId, {
            to: payload.to ?? '',
            subject: payload.subject ?? '',
            body,
          });
        }
        setEmailCompose(null)
        setToastMessage(payload.forwardToExternalId ? 'Message forwarded' : 'Email sent')
        if (useGoogle) {
          await refreshGoogle()
        } else {
          await refreshMicrosoft()
        }
      } catch (error) {
        console.error(error)
        setToastMessage(error instanceof Error ? error.message : 'Failed to send email')
      } finally {
        setEmailSending(false)
      }
    },
    [isGoogleConnectedAccount, integrationAccountDefaults.emailSignature, refreshGoogle, refreshMicrosoft],
  )

  const handleToggleEmailRead = useCallback(
    async (id: string, isRead: boolean) => {
      const email =
        displayEmails.find((entry) => entry.id === id) ??
        graphEmails.find((entry) => entry.id === id) ??
        emails.find((entry) => entry.id === id)
      if (!email) return

      const applyRead = (entry: EmailMessage): EmailMessage =>
        entry.id === id ? { ...entry, unread: !isRead } : entry

      setEmails((prev) => prev.map(applyRead))
      setGraphEmails((prev) => prev.map(applyRead))

      if (!email.externalId || !email.connectedAccountId || email.provider !== 'microsoft') return

      try {
        await updateMicrosoftMailReadState(email.connectedAccountId, email.externalId, isRead)
      } catch (error) {
        console.error(error)
        setEmails((prev) => prev.map((entry) => (entry.id === id ? email : entry)))
        setGraphEmails((prev) => prev.map((entry) => (entry.id === id ? email : entry)))
      }
    },
    [displayEmails, emails, graphEmails],
  )

  const handleMoveEmail = useCallback(
    async (email: EmailMessage, destinationFolderGraphId: string) => {
      const connectedAccountId = resolveEmailConnectedAccountId(email)
      if (!email.externalId || !connectedAccountId) return

      try {
        await moveMicrosoftMail(connectedAccountId, email.externalId, destinationFolderGraphId)
        setGraphEmails((prev) => prev.filter((entry) => entry.id !== email.id))
        setEmailSelectedId((current) => (current === email.id ? null : current))
        setToastMessage('Message moved')
      } catch (error) {
        console.error(error)
        setToastMessage(error instanceof Error ? error.message : 'Failed to move message')
      }
    },
    [resolveEmailConnectedAccountId],
  )

  const handleSearchMicrosoftMail = useCallback(
    async (query: string, accountId: string) => {
      const account = microsoftStatus?.accounts.find(
        (entry) => microsoftAccountKey(entry.id) === accountId || entry.id === accountId,
      )
      if (!account || !query.trim()) return
      try {
        const results = await searchMicrosoftMail(account.id, query.trim())
        setGraphEmails((prev) => {
          const others = prev.filter((entry) => entry.accountId !== accountId)
          return [...results, ...others]
        })
      } catch (error) {
        console.error(error)
      }
    },
    [microsoftStatus],
  )

  const handleDeleteEmail = useCallback(
    async (email: EmailMessage) => {
      const connectedAccountId = resolveEmailConnectedAccountId(email)
      const isRemote = Boolean(email.externalId && connectedAccountId)

      const confirmMessage = isRemote
        ? isGoogleEmail(email)
          ? 'Move this message to Gmail Trash?'
          : 'Move this message to Deleted Items in Outlook?'
        : 'Remove this message from your inbox?'
      if (!window.confirm(confirmMessage)) return

      try {
        if (isRemote) {
          if (isGoogleEmail(email)) {
            await deleteGoogleMail(connectedAccountId!, email.externalId!)
          } else {
            await deleteMicrosoftMail(connectedAccountId!, email.externalId!)
          }
          setGraphEmails((prev) => prev.filter((entry) => entry.id !== email.id))
        } else {
          setEmails((prev) => prev.filter((entry) => entry.id !== email.id))
        }
        setEmailSelectedId((current) => (current === email.id ? null : current))
        setToastMessage('Message deleted')
      } catch (error) {
        console.error(error)
        setToastMessage(error instanceof Error ? error.message : 'Failed to delete message')
      }
    },
    [resolveEmailConnectedAccountId],
  )

  const handleBulkDeleteEmails = useCallback(
    async (targets: EmailMessage[]) => {
      if (targets.length === 0) return
      if (
        !window.confirm(
          `Delete ${targets.length} message${targets.length === 1 ? '' : 's'}?`,
        )
      ) {
        return
      }

      const remote = targets.filter(
        (email) => email.externalId && resolveEmailConnectedAccountId(email),
      )
      const local = targets.filter((email) => !email.externalId)

      const results = await Promise.allSettled(
        remote.map(async (email) => {
          const connectedAccountId = resolveEmailConnectedAccountId(email)!
          if (isGoogleEmail(email)) {
            await deleteGoogleMail(connectedAccountId, email.externalId!)
          } else {
            await deleteMicrosoftMail(connectedAccountId, email.externalId!)
          }
        }),
      )

      const removedRemoteIds = new Set(
        remote.filter((_, index) => results[index].status === 'fulfilled').map((e) => e.id),
      )
      const removedLocalIds = new Set(local.map((e) => e.id))
      const removedIds = new Set([...removedRemoteIds, ...removedLocalIds])

      if (removedIds.size === 0) {
        setToastMessage('Failed to delete messages')
        return
      }

      setGraphEmails((prev) => prev.filter((entry) => !removedIds.has(entry.id)))
      setEmails((prev) => prev.filter((entry) => !removedIds.has(entry.id)))
      setEmailSelectedId((current) => (current && removedIds.has(current) ? null : current))
      setToastMessage(
        removedIds.size === targets.length
          ? `Deleted ${removedIds.size} message${removedIds.size === 1 ? '' : 's'}`
          : `Deleted ${removedIds.size} of ${targets.length} messages`,
      )
    },
    [resolveEmailConnectedAccountId],
  )

  const handleBulkMarkEmailsRead = useCallback(
    async (targets: EmailMessage[], isRead: boolean) => {
      await Promise.all(targets.map((email) => handleToggleEmailRead(email.id, isRead)))
      setToastMessage(
        isRead
          ? `Marked ${targets.length} as read`
          : `Marked ${targets.length} as unread`,
      )
    },
    [handleToggleEmailRead],
  )

  const handleBulkMoveEmails = useCallback(
    async (targets: EmailMessage[], destinationFolderGraphId: string) => {
      const actionable = targets.filter(
        (email) => email.externalId && resolveEmailConnectedAccountId(email),
      )
      if (actionable.length === 0) return

      const results = await Promise.allSettled(
        actionable.map((email) =>
          moveMicrosoftMail(resolveEmailConnectedAccountId(email)!, email.externalId!, destinationFolderGraphId),
        ),
      )

      const movedIds = new Set(
        actionable.filter((_, index) => results[index].status === 'fulfilled').map((e) => e.id),
      )
      if (movedIds.size === 0) {
        setToastMessage('Failed to move messages')
        return
      }

      setGraphEmails((prev) => prev.filter((entry) => !movedIds.has(entry.id)))
      setEmailSelectedId((current) => (current && movedIds.has(current) ? null : current))
      setToastMessage(`Moved ${movedIds.size} message${movedIds.size === 1 ? '' : 's'}`)
    },
    [resolveEmailConnectedAccountId],
  )

  const handleSaveNote = useCallback(
    async (input: {
      note: Note | null
      title: string
      body: string
      colour?: string
      saveToOutlook: boolean
    }) => {
      const now = new Date().toISOString()
      const account = microsoftStatus?.accounts[0]

      if (input.note?.externalId && input.note.connectedAccountId) {
        await updateMicrosoftNote(input.note.connectedAccountId, input.note.externalId, {
          title: input.title,
          body: input.body,
        })
        const updated: Note = {
          ...input.note,
          title: input.title,
          body: input.body,
          updatedAt: now,
        }
        setGraphNotes((prev) =>
          prev.map((note) => (note.id === updated.id ? updated : note)),
        )
        return
      }

      if (input.saveToOutlook && account) {
        const created = await createMicrosoftNote(account.id, {
          title: input.title,
          body: input.body,
        })
        await refreshMicrosoft()
        void created
        return
      }

      if (input.note) {
        const updated: Note = {
          ...input.note,
          title: input.title,
          body: input.body,
          colour: input.colour ?? input.note.colour,
          updatedAt: now,
        }
        setNotes((prev) => prev.map((note) => (note.id === updated.id ? updated : note)))
        return
      }

      setNotes((prev) => [
        ...prev,
        createLocalNote({
          title: input.title,
          body: input.body,
          colour: input.colour,
        }),
      ])
    },
    [microsoftStatus, refreshMicrosoft],
  )

  const handleDeleteNote = useCallback(
    async (note: Note) => {
      if (note.externalId && note.connectedAccountId) {
        await deleteMicrosoftNote(note.connectedAccountId, note.externalId)
        setGraphNotes((prev) => prev.filter((entry) => entry.id !== note.id))
        return
      }
      setNotes((prev) => prev.filter((entry) => entry.id !== note.id))
    },
    [],
  )

  const goToday = () => {
    const today = todayCalendarDate()
    setWeekViewScrollDate(
      getDefaultWeekViewStart(calendarPreferences.weekViewAnchor, calendarPreferences.weekStartsOn, today),
    )
    setWeekStart(startOfWeek(today, calendarPreferences.weekStartsOn))
    setFocusDate(today)
  }

  const handleCalendarPreferencesChange = useCallback((prefs: CalendarPreferences) => {
    setCalendarPreferences((previous) => {
      if (prefs.defaultView !== previous.defaultView) {
        setViewMode(prefs.defaultView)
      }
      return prefs
    })
  }, [])

  const handleMonthViewExpandChange = useCallback((monthViewExpandWeeks: boolean) => {
    setCalendarPreferences((previous) => ({ ...previous, monthViewExpandWeeks }))
  }, [])

  const handleShowCalendarAccount = useCallback(
    (accountId: string) => {
      setCalendarFilter({ mode: 'account', accountId })
      setSection('calendar')
      setViewMode(calendarPreferences.defaultView)
    },
    [calendarPreferences.defaultView],
  )

  const handleDaySelect = (date: Date) => {
    setFocusDate(normalizeCalendarDate(date))
    setViewMode('day')
  }

  const calendarMenuActions = useMemo(
    (): CalendarMenuActions => ({
      onOpenItem: openEditModal,
      onCopyItem: handleCopyItem,
      onDuplicateItem: handleDuplicateItem,
      onDeleteItem: (id) => void handleDeleteItem(id),
      onToggleComplete: (id) => void handleToggleComplete(id),
      onNewEvent: handleNewEventOnDay,
      onGoToDay: handleDaySelect,
      onPasteToDay: handlePasteToDay,
    }),
    [
      handleCopyItem,
      handleDeleteItem,
      handleDuplicateItem,
      handleNewEventOnDay,
      handlePasteToDay,
      handleToggleComplete,
    ],
  )

  const handlePrimaryTabChange = (tab: PrimaryCalendarTab) => {
    if (tab === 'week') {
      setViewMode(
        calendarPreferences.defaultView.startsWith('week')
          ? calendarPreferences.defaultView
          : 'week-list',
      )
    } else if (tab === 'today') {
      setFocusDate(todayCalendarDate())
      setViewMode('day')
    } else if (tab === 'month') {
      setViewMode('month')
    }
  }

  const showFab =
    !kioskMode &&
    (section === 'calendar' ||
      section === 'planner' ||
      section === 'today')

  const openSettings = () => {
    setSettingsOpen(true)
    setSettingsExpanded(true)
  }

  const toggleSettings = () => {
    setSettingsOpen((open) => {
      if (!open) {
        setSettingsExpanded(true)
        return true
      }
      return false
    })
  }

  const handleSectionChange = (next: AppSection) => {
    if (next === 'super-admin') {
      setSettingsOpen(false)
    }
    setSection(next)
  }

  const settingsView = (
    <SettingsView
      embedded
      categories={categories}
      items={displayCalendarItems}
      listOptions={listOptions}
      onListOptionsChange={setListOptions}
      itemDisplayOptions={itemDisplayOptions}
      onItemDisplayOptionsChange={setItemDisplayOptions}
      calendarPreferences={calendarPreferences}
      onCalendarPreferencesChange={handleCalendarPreferencesChange}
      integrationPreferences={integrationPreferences}
      onIntegrationPreferencesChange={setIntegrationPreferences}
      integrationAccountDefaults={integrationAccountDefaults}
      onIntegrationAccountDefaultsChange={setIntegrationAccountDefaults}
      graphCalendars={graphCalendars}
      graphGoogleCalendars={graphGoogleCalendars}
      graphTodoLists={graphTodoLists}
      onSaveCategory={handleSaveCategory}
      onDeleteCategory={handleDeleteCategory}
      permissionsConfig={permissionsConfig}
      onPermissionsChange={setPermissionsConfig}
      microsoftStatus={microsoftStatus}
      microsoftLoading={microsoftLoading}
      onMicrosoftRefresh={refreshMicrosoft}
      googleStatus={googleStatus}
      googleLoading={googleLoading}
      onGoogleRefresh={refreshGoogle}
      appleStatus={appleStatus}
      appleLoading={appleLoading}
      onAppleRefresh={refreshApple}
      emailAccounts={emailAccounts}
      calendarAccounts={calendarAccounts}
      usingRealMicrosoft={usingRealMicrosoft}
      usingRealGoogle={usingRealGoogle}
      usingRealApple={usingRealApple}
      onShowCalendarAccount={handleShowCalendarAccount}
      onShowToast={setToastMessage}
      onOpenBoard={() => handleSectionChange('board')}
      onEnterKiosk={() => setKioskMode(true)}
      sharedBoardCount={sharedBoardItems.length}
      authEnabled={config?.enabled ?? false}
      authUser={user}
      onAuthUserUpdated={setUser}
      onLogout={config?.enabled ? logout : undefined}
      onOpenSuperAdmin={
        user?.isSuperAdmin ? () => handleSectionChange('super-admin') : undefined
      }
    />
  )

  if (kioskMode) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-wf-bg">
        <div className="relative min-h-0 flex-1">
        <FamilyBoardView
          sharedItems={sharedBoardItems}
          pins={boardPins}
          links={links}
          items={displayCalendarItems}
          emails={displayEmails}
          onPinsChange={setBoardPins}
          onPinUpdate={handlePinUpdate}
          canDismissVoicePins={canDismissVoicePins}
          onItemTap={handleSharedBoardItemTap}
          onNavigateLink={handleNavigateLink}
          kiosk
          onExitKiosk={() => setKioskPinGateOpen(true)}
        />
        </div>
        <KioskPinGate
          open={kioskPinGateOpen}
          onClose={() => setKioskPinGateOpen(false)}
          onSuccess={() => {
            setKioskMode(false)
            setKioskPinGateOpen(false)
          }}
        />
      </div>
    )
  }

  return (
    <CalendarMenuProvider
      categories={categories}
      clipboardItem={clipboardItem}
      actions={calendarMenuActions}
    >
    <CalendarLinksProvider value={calendarLinksValue}>
    <div className="flex h-full min-h-0 flex-col bg-wf-bg">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
        {section === 'calendar' && (
          <>
            <CalendarNav
              viewMode={viewMode}
              selectedDay={focusDate}
              categories={categories}
              listOptions={listOptions}
              calendarFilter={calendarFilter}
              calendarAccounts={calendarAccounts}
              onCalendarFilterChange={setCalendarFilter}
              onListOptionsChange={setListOptions}
              onToday={goToday}
              onViewChange={setViewMode}
              onPrimaryTabChange={handlePrimaryTabChange}
            />
            <div className={viewMode === 'week-board' || viewMode === 'week-list' || viewMode === 'week-timeline' || viewMode === 'month' ? 'h-[calc(100%-130px)] min-h-[400px]' : ''}>
              {viewMode === 'week-list' || viewMode === 'week-board' || viewMode === 'week-timeline' ? (
                <WeekView
                  weekStartsOn={calendarPreferences.weekStartsOn}
                  weekViewAnchor={calendarPreferences.weekViewAnchor}
                  scrollToDate={weekViewScrollDate}
                  initialScrollDate={focusDate}
                  onFocusDateChange={handleFocusDateFromWeek}
                  onScrollToDateApplied={() => setWeekViewScrollDate(null)}
                  items={calendarItems}
                  categories={categories}
                  viewMode={viewMode}
                  listOptions={listOptions}
                  displayOptions={itemDisplayOptions}
                  onWeekChange={setWeekStart}
                  onItemTap={openEditModal}
                  onToggleComplete={handleToggleComplete}
                />
              ) : viewMode === 'day' ? (
                <DayView
                  date={focusDate}
                  items={calendarItems}
                  categories={categories}
                  listOptions={listOptions}
                  displayOptions={itemDisplayOptions}
                  onItemTap={openEditModal}
                  onToggleComplete={handleToggleComplete}
                />
              ) : viewMode === 'month' ? (
                <MonthView
                  currentDate={focusDate}
                  selectedDay={focusDate}
                  items={calendarItems}
                  displayOptions={itemDisplayOptions}
                  weekStartsOn={calendarPreferences.weekStartsOn}
                  expandWeekRows={calendarPreferences.monthViewExpandWeeks}
                  onExpandWeekRowsChange={handleMonthViewExpandChange}
                  onDaySelect={handleDaySelect}
                  onDayAdd={(date) => {
                    setFocusDate(normalizeCalendarDate(date))
                    setEditingItem(null)
                    setModalOpen(true)
                  }}
                  onMonthChange={handleMonthFocusChange}
                  onItemTap={openEditModal}
                />
              ) : viewMode === 'agenda' ? (
                <AgendaView
                  items={calendarItems}
                  categories={categories}
                  listOptions={listOptions}
                  displayOptions={itemDisplayOptions}
                  onItemTap={openEditModal}
                  onToggleComplete={handleToggleComplete}
                />
              ) : (
                <YearView />
              )}
            </div>
          </>
        )}

        {section === 'planner' && (
          <PlannerView
            items={displayCalendarItems}
            categories={categories}
            listOptions={listOptions}
            displayOptions={itemDisplayOptions}
            onListOptionsChange={setListOptions}
            onItemTap={openEditModal}
            onToggleComplete={handleToggleComplete}
            diarySetupHint={plannerDiaryHint}
          />
        )}

        {section === 'board' && (
          <BoardSplitView
            weekStart={weekStart}
            items={displayCalendarItems}
            categories={categories}
            listOptions={listOptions}
            displayOptions={itemDisplayOptions}
            sharedItems={sharedBoardItems}
            pins={boardPins}
            links={links}
            emails={displayEmails}
            onPinsChange={setBoardPins}
            onPinUpdate={handlePinUpdate}
            onItemTap={openEditModal}
            onSharedItemTap={handleSharedBoardItemTap}
            onNavigateLink={handleNavigateLink}
            onEnterKiosk={() => setKioskMode(true)}
            canDismissVoicePins={canDismissVoicePins}
            canManageBoardLayout={canManageBoardLayout}
          />
        )}

        {section === 'email' && (
          <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden">
            <EmailView
            emails={displayEmails}
            emailAccounts={emailAccounts}
            emailFolders={emailFolders}
            initialSearch={emailSearchQuery ?? undefined}
            onClearInitialSearch={() => setEmailSearchQuery(null)}
            selectedId={emailSelectedId}
            onSelectedIdChange={setEmailSelectedId}
            links={links}
            items={displayCalendarItems}
            onToggleStar={(id) =>
              setEmails((prev) =>
                prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)),
              )
            }
            onToggleRead={(id) => void handleToggleEmailRead(id, true)}
            onSetReadState={(id, isRead) => void handleToggleEmailRead(id, isRead)}
            onCreateTask={handleCreateTaskFromEmail}
            onLinkExisting={openLinkPickerForEmail}
            onNavigateLink={handleNavigateLink}
            onRemoveLink={handleRemoveLink}
            itemShares={itemShares}
            onShareUpdate={handleShareUpdate}
            onOpenActionFlow={setEmailActionFlowEmail}
            onLoadFolderMessages={handleLoadFolderMessages}
            loadingFolderIds={loadingEmailFolders}
            usingRealIntegrations={usingRealIntegrations}
            onCompose={() => setEmailCompose({ mode: 'compose' })}
            onReply={(email) => setEmailCompose({ mode: 'reply', replyTo: email })}
            onReplyAll={(email) => setEmailCompose({ mode: 'replyAll', replyTo: email })}
            onForward={(email) => setEmailCompose({ mode: 'forward', replyTo: email })}
            onMoveMail={handleMoveEmail}
            onServerSearch={usingRealMicrosoft ? handleSearchMicrosoftMail : undefined}
            onDelete={handleDeleteEmail}
            onBulkDelete={handleBulkDeleteEmails}
            onBulkMarkRead={handleBulkMarkEmailsRead}
            onBulkMove={handleBulkMoveEmails}
          />
          </div>
        )}

        {section === 'contacts' && (
          <ContactsView
            contacts={displayContacts}
            emails={displayEmails}
            emailAccounts={emailAccounts}
            emailFolders={emailFolders}
            onSaveContact={handleSaveContact}
            onDeleteContact={handleDeleteContact}
            onToggleStar={handleToggleContactStar}
            onOpenEmail={handleOpenEmailFromContact}
          />
        )}

        {section === 'notes' && (
          <NotesView
            notes={displayNotes}
            usingRealMicrosoft={usingRealMicrosoft}
            microsoftLoading={notesLoading}
            selectedId={noteSelectedId}
            onSelectedIdChange={setNoteSelectedId}
            itemShares={itemShares}
            onShareUpdate={handleShareUpdate}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onOpenSettings={openSettings}
            onShowToast={setToastMessage}
          />
        )}

        {section === 'today' && (
          <TodayView
            items={displayCalendarItems}
            categories={categories}
            listOptions={listOptions}
            displayOptions={itemDisplayOptions}
            onListOptionsChange={setListOptions}
            onItemTap={openEditModal}
            onToggleComplete={handleToggleComplete}
          />
        )}

        {section === 'super-admin' && user?.isSuperAdmin && (
          <SuperAdminView
            onBack={() => {
              openSettings()
            }}
          />
        )}
        </main>

        <SettingsPanel
          open={settingsOpen}
          expanded={settingsExpanded}
          onExpandedChange={setSettingsExpanded}
          onClose={() => setSettingsOpen(false)}
        >
          {settingsView}
        </SettingsPanel>
      </div>

      {showFab && (
        <button
          type="button"
          onClick={openAddModal}
          className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-wf-accent text-white shadow-[var(--shadow-fab)] transition-transform active:scale-95"
          aria-label="Add item"
        >
          <Plus size={26} strokeWidth={2} />
        </button>
      )}

      <BottomNav
        active={section}
        settingsOpen={settingsOpen}
        onChange={handleSectionChange}
        onSettingsToggle={toggleSettings}
        unreadEmails={unreadCount}
      />

      <ItemFormModal
        open={modalOpen}
        item={editingItem}
        categories={categories}
        defaultDate={section === 'today' ? new Date() : focusDate}
        links={links}
        emails={displayEmails}
        items={displayCalendarItems}
        attachments={attachments}
        onAttachmentUploaded={handleAttachmentUploaded}
        usingRealMicrosoft={usingRealMicrosoft}
        usingRealGoogle={usingRealGoogle}
        microsoftCalendars={graphCalendars}
        googleCalendars={graphGoogleCalendars}
        microsoftTodoLists={graphTodoLists}
        integrationAccountDefaults={integrationAccountDefaults}
        connectedAccountEmails={outlookAccountEmails}
        itemShare={
          editingItem
            ? getShareForEntity(
                itemShares,
                getItemLinkType(editingItem, categories),
                editingItem.id,
              )
            : undefined
        }
        onShareUpdate={handleShareUpdate}
        onSave={handleSaveItem}
        calendarPreferences={calendarPreferences}
        onDelete={handleDeleteItem}
        onClose={() => setModalOpen(false)}
        onNavigateLink={handleNavigateLink}
        onLinkExisting={editingItem ? () => openLinkPickerForItem(editingItem) : undefined}
        onRemoveLink={handleRemoveLink}
      />

      <LinkExistingModal
        open={linkPicker !== null}
        sourceType={linkPicker?.sourceType ?? 'email'}
        sourceId={linkPicker?.sourceId ?? ''}
        sourceLabel={linkPicker?.sourceLabel ?? ''}
        items={displayCalendarItems}
        categories={categories}
        emails={displayEmails}
        links={links}
        onClose={() => setLinkPicker(null)}
        onSelect={handleLinkExistingSelect}
      />

      <EmailActionFlowModal
        open={emailActionFlowEmail !== null}
        email={emailActionFlowEmail}
        defaultDueDate="2026-06-30"
        usingRealMicrosoft={usingRealMicrosoft}
        usingRealGoogle={usingRealGoogle}
        onClose={() => setEmailActionFlowEmail(null)}
        onSubmit={handleEmailActionFlow}
      />

      <EmailComposeModal
        open={emailCompose !== null}
        mode={emailCompose?.mode ?? 'compose'}
        replyTo={emailCompose?.replyTo}
        accounts={emailAccounts}
        defaultAccountId={resolveDefaultComposeAccountId(
          integrationAccountDefaults,
          microsoftStatus,
          googleStatus,
        )}
        sending={emailSending}
        onClose={() => setEmailCompose(null)}
        onSend={handleEmailComposeSend}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
    </CalendarLinksProvider>
    </CalendarMenuProvider>
  )
}
