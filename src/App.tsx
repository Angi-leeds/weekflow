import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { CreateLinkInput, EntityType, ItemLink } from '../shared/links'
import type { ItemShare, UpsertItemShareInput } from '../shared/itemShares'
import type { BoardPin } from '../shared/boardPins'
import type { SharedBoardItem } from '../shared/boardPins'
import type { Attachment } from '../shared/attachments'
import type { AppSection, CalendarItem, CalendarViewMode, Category, Contact, EmailMessage, CalendarFilter, CalendarPreferences, IntegrationAccountDefaults, IntegrationPreferences, Note, EmailFolder } from './types'
import { type ListDisplayOptions } from './types'
import { memberCan } from '../shared/householdPermissions'
import { initialEmails, initialItems, getMockCloudFolder, calendarAccountForCategory } from './mockData'
import { addWeeks, addDays, generateId, parseDate, startOfWeek, toISODate } from './dateUtils'
import type { EmailActionFlowOptions } from '../shared/emailActionFlow'
import { createLink, fetchAllLinks, removeLink } from './lib/links'
import { fetchAllItemShares, getShareForEntity, upsertItemShare } from './lib/itemShares'
import { createBoardPin, fetchAllBoardPins, getPinForItem, updateBoardPin } from './lib/boardPins'
import { resolveSharedBoardItems } from './lib/boardItemHelpers'
import { fetchAllAttachments } from './lib/attachments'
import { loadCalendarFilter, saveCalendarFilter } from './lib/calendarSettings'
import {
  loadCalendarPreferences,
  loadIntegrationAccountDefaults,
  loadIntegrationPreferences,
  loadListOptions,
  saveCalendarPreferences,
  saveIntegrationAccountDefaults,
  saveIntegrationPreferences,
  saveListOptions,
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
  createMicrosoftTodo,
  deleteMicrosoftNote,
  fetchAllMicrosoftCalendar,
  fetchAllMicrosoftCalendarsList,
  fetchAllMicrosoftContacts,
  fetchAllMicrosoftMail,
  fetchAllMicrosoftTodoLists,
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
  copyEmailToOneDriveFolder,
  syncCalendarToMicrosoft,
  updateMicrosoftNote,
} from './lib/microsoft'
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
} from './lib/contacts'
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
  const [categories, setCategories] = useState<Category[]>(
    () => loadStoredCategories() ?? DEFAULT_CATEGORIES,
  )
  const [items, setItems] = useState<CalendarItem[]>(initialItems)
  const [emails, setEmails] = useState(initialEmails)
  const [contacts, setContacts] = useState<Contact[]>(
    () => loadStoredContacts() ?? INITIAL_CONTACTS,
  )
  const [notes, setNotes] = useState<Note[]>(
    () => loadStoredNotes() ?? INITIAL_NOTES,
  )
  const [emailSearchQuery, setEmailSearchQuery] = useState<string | null>(null)
  const [calendarPreferences, setCalendarPreferences] = useState(() => loadCalendarPreferences())
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), loadCalendarPreferences().weekStartsOn),
  )
  const [viewMode, setViewMode] = useState<CalendarViewMode>(
    () => loadCalendarPreferences().defaultView,
  )
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [monthDate, setMonthDate] = useState(new Date())

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null)
  const [listOptions, setListOptions] = useState<ListDisplayOptions>(() => loadListOptions())
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
    try {
      const status = await fetchMicrosoftStatus()
      setMicrosoftStatus(status)
      const accounts = status.accounts
      if (accounts.length > 0) {
        const [
          mailResult,
          calendarResult,
          notesResult,
          contactsResult,
          calendarsResult,
          todoListsResult,
        ] = await Promise.allSettled([
          fetchAllMicrosoftMail(accounts),
          fetchAllMicrosoftCalendar(accounts),
          Promise.all(accounts.map((account) => fetchMicrosoftNotes(account.id))).then((batches) =>
            batches.flat(),
          ),
          fetchAllMicrosoftContacts(accounts),
          fetchAllMicrosoftCalendarsList(accounts),
          fetchAllMicrosoftTodoLists(accounts),
        ])

        const mailBundle =
          mailResult.status === 'fulfilled' ? mailResult.value : { mail: [], folders: [] }
        const calendar = calendarResult.status === 'fulfilled' ? calendarResult.value : []
        const outlookNotes = notesResult.status === 'fulfilled' ? notesResult.value : []
        const outlookContacts = contactsResult.status === 'fulfilled' ? contactsResult.value : []
        const calendars = calendarsResult.status === 'fulfilled' ? calendarsResult.value : []
        const todoLists = todoListsResult.status === 'fulfilled' ? todoListsResult.value : []

        for (const result of [
          mailResult,
          calendarResult,
          notesResult,
          contactsResult,
          calendarsResult,
          todoListsResult,
        ]) {
          if (result.status === 'rejected') console.error(result.reason)
        }
        setGraphEmailFolders((prev) => {
          const other = prev.filter(
            (folder) => !folder.accountId.startsWith('ms-'),
          )
          return [...mailBundle.folders, ...other]
        })
        setGraphEmails((prev) => {
          const other = prev.filter((email) => email.provider !== 'microsoft')
          return mergeGraphMail([], [...mailBundle.mail, ...other])
        })
        setGraphCalendarItems((prev) => {
          const other = prev.filter((item) => item.provider !== 'microsoft')
          return mergeGraphCalendar([], [...calendar, ...other])
        })
        setGraphNotes(outlookNotes)
        setGraphContacts(outlookContacts)
        setGraphCalendars(calendars)
        setGraphTodoLists(todoLists)
      } else {
        setGraphEmailFolders((prev) => prev.filter((folder) => !folder.accountId.startsWith('ms-')))
        setGraphEmails((prev) => prev.filter((email) => email.provider !== 'microsoft'))
        setGraphCalendarItems((prev) => prev.filter((item) => item.provider !== 'microsoft'))
        setGraphNotes([])
        setGraphContacts([])
        setGraphCalendars([])
        setGraphTodoLists([])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setMicrosoftLoading(false)
    }
  }, [])

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

  const displayNotes = useMemo(
    () => mergeGraphNotes(notes, graphNotes),
    [notes, graphNotes],
  )

  const displayContacts = useMemo(
    () => mergeGraphContacts(contacts, graphContacts),
    [contacts, graphContacts],
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

  const calendarItems = useMemo(() => {
    if (calendarFilter.mode === 'merged') return displayCalendarItems
    return displayCalendarItems.filter((item) =>
      calendarFilterMatchesItem(calendarFilter, item.accountId),
    )
  }, [displayCalendarItems, calendarFilter])

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
    saveCalendarPreferences(calendarPreferences)
  }, [calendarPreferences])

  useEffect(() => {
    saveIntegrationPreferences(integrationPreferences)
  }, [integrationPreferences])

  useEffect(() => {
    saveIntegrationAccountDefaults(integrationAccountDefaults)
  }, [integrationAccountDefaults])

  useEffect(() => {
    setWeekStart(startOfWeek(new Date(), calendarPreferences.weekStartsOn))
  }, [calendarPreferences.weekStartsOn])

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
      sectionParam === 'settings' ||
      sectionParam === 'super-admin'
    ) {
      if (sectionParam === 'super-admin' && !user?.isSuperAdmin) {
        setSection('settings')
      } else {
        setSection(sectionParam)
      }
    }

    const microsoftResult = params.get('microsoft')
    if (microsoftResult === 'connected') {
      setSection('settings')
      setToastMessage(`Connected ${params.get('email') ?? 'Microsoft account'}`)
      void refreshMicrosoft()
    } else if (microsoftResult === 'error') {
      setSection('settings')
      setToastMessage('Microsoft sign-in failed. Check server OAuth settings.')
    }

    const googleResult = params.get('google')
    if (googleResult === 'connected') {
      setSection('settings')
      setToastMessage(`Connected ${params.get('email') ?? 'Google account'}`)
      void refreshGoogle()
    } else if (googleResult === 'error') {
      setSection('settings')
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
    async (item: CalendarItem) => {
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
      const normalized = {
        ...item,
        accountId: item.accountId ?? fallbackAccountKey,
      }
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === normalized.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = normalized
          return next
        }
        return [...prev, normalized]
      })

      const category = categories.find((entry) => entry.id === normalized.categoryId)

      if (useGoogle) {
        const connectedAccountId = resolveGoogleConnectedAccountId(
          googleAccounts,
          integrationAccountDefaults,
          normalized.accountId,
        )
        if (!connectedAccountId) return

        if (category?.kind === 'task') {
          setToastMessage('Tasks sync to Microsoft To Do only')
          return
        }

        const defaultCalendarId =
          normalized.calendarId ?? integrationAccountDefaults.googleCalendar?.defaultCalendarId

        try {
          const result = await syncCalendarToGoogle(
            connectedAccountId,
            normalized,
            defaultCalendarId,
          )
          setItems((prev) =>
            prev.map((entry) =>
              entry.id === normalized.id
                ? {
                    ...entry,
                    externalId: result.externalId,
                    provider: 'google',
                    connectedAccountId,
                  }
                : entry,
            ),
          )
          await refreshGoogle()
          setToastMessage('Synced to Google Calendar')
        } catch (error) {
          console.error(error)
          setToastMessage(
            error instanceof Error ? error.message : 'Saved locally; Google Calendar sync failed',
          )
        }
        return
      }

      const connectedAccountId = resolveConnectedAccountId(
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

      const defaultCalendarId =
        normalized.calendarId ?? integrationAccountDefaults.calendar?.defaultCalendarId
      const defaultTodoListId = integrationAccountDefaults.tasks?.defaultTodoListId

      try {
        if (category?.kind === 'task') {
          await createMicrosoftTodo(connectedAccountId, {
            title: normalized.title,
            dueDate: normalized.date,
            notes: normalized.notes,
            todoListId: normalized.todoListId ?? defaultTodoListId,
          })
          setToastMessage('Task synced to Microsoft To Do')
          return
        }

        const result = await syncCalendarToMicrosoft(
          connectedAccountId,
          normalized,
          photoAttachment
            ? {
                storageKey: photoAttachment.storageKey,
                mimeType: photoAttachment.mimeType,
                filename: photoAttachment.filename,
              }
            : undefined,
          defaultCalendarId,
        )
        setItems((prev) =>
          prev.map((entry) =>
            entry.id === normalized.id
              ? {
                  ...entry,
                  externalId: result.externalId,
                  provider: 'microsoft',
                  connectedAccountId,
                }
              : entry,
          ),
        )
        setToastMessage(
          result.photoAttached
            ? 'Synced to Outlook calendar with photo'
            : photoAttachment
              ? 'Synced to Outlook calendar (photo upload skipped)'
              : 'Synced to Outlook calendar',
        )
      } catch (error) {
        console.error(error)
        setToastMessage(
          error instanceof Error ? error.message : 'Saved locally; Outlook sync failed',
        )
      }
    },
    [attachments, categories, googleStatus, integrationAccountDefaults, microsoftStatus, refreshGoogle],
  )

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const handleToggleComplete = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)),
    )
  }, [])

  const openAddModal = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const openEditModal = (item: CalendarItem) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleSaveContact = useCallback((contact: Contact) => {
    setContacts((prev) => {
      const index = prev.findIndex((entry) => entry.id === contact.id)
      if (index >= 0) {
        const next = [...prev]
        next[index] = contact
        return next
      }
      return [...prev, contact]
    })
  }, [])

  const handleDeleteContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((contact) => contact.id !== id))
  }, [])

  const handleToggleContactStar = useCallback((id: string) => {
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === id ? { ...contact, starred: !contact.starred } : contact,
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
    }) => {
      setEmailSending(true)
      try {
        const useGoogle = isGoogleConnectedAccount(payload.connectedAccountId)
        if (payload.replyToExternalId) {
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
          await sendMicrosoftMail(payload.connectedAccountId, {
            to: payload.to ?? '',
            subject: payload.subject ?? '',
            body: payload.body,
          })
        }
        setEmailCompose(null)
        setToastMessage('Email sent')
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
    [isGoogleConnectedAccount, refreshGoogle, refreshMicrosoft],
  )

  const handleDeleteEmail = useCallback(
    async (email: EmailMessage) => {
      const connectedAccountId = resolveEmailConnectedAccountId(email)
      if (!email.externalId || !connectedAccountId) return
      const useGoogle = isGoogleEmail(email)
      const confirmMessage = useGoogle
        ? 'Move this message to Gmail Trash?'
        : 'Move this message to Deleted Items in Outlook?'
      if (!window.confirm(confirmMessage)) return

      try {
        if (useGoogle) {
          await deleteGoogleMail(connectedAccountId, email.externalId)
        } else {
          await deleteMicrosoftMail(connectedAccountId, email.externalId)
        }
        setGraphEmails((prev) => prev.filter((entry) => entry.id !== email.id))
        setEmailSelectedId((current) => (current === email.id ? null : current))
        setToastMessage('Message deleted')
      } catch (error) {
        console.error(error)
        setToastMessage(error instanceof Error ? error.message : 'Failed to delete message')
      }
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
    const today = new Date()
    setWeekStart(startOfWeek(today, calendarPreferences.weekStartsOn))
    setSelectedDay(today)
    setMonthDate(today)
  }

  const handleCalendarPreferencesChange = useCallback((prefs: CalendarPreferences) => {
    setCalendarPreferences(prefs)
    setViewMode(prefs.defaultView)
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
    setSelectedDay(date)
    setViewMode('day')
  }

  const handlePrimaryTabChange = (tab: PrimaryCalendarTab) => {
    if (tab === 'week') {
      setViewMode(
        calendarPreferences.defaultView.startsWith('week')
          ? calendarPreferences.defaultView
          : 'week-list',
      )
    } else if (tab === 'today') {
      setSelectedDay(new Date())
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
    <div className="flex h-full min-h-0 flex-col bg-wf-bg">
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        {section === 'calendar' && (
          <>
            <CalendarNav
              weekStart={weekStart}
              displayDate={viewMode === 'month' ? monthDate : viewMode === 'day' ? selectedDay : weekStart}
              viewMode={viewMode}
              selectedDay={selectedDay}
              categories={categories}
              listOptions={listOptions}
              calendarFilter={calendarFilter}
              calendarAccounts={calendarAccounts}
              onCalendarFilterChange={setCalendarFilter}
              onListOptionsChange={setListOptions}
              onPrevWeek={() => setWeekStart((w) => addWeeks(w, -1))}
              onNextWeek={() => setWeekStart((w) => addWeeks(w, 1))}
              onToday={goToday}
              onViewChange={setViewMode}
              onPrimaryTabChange={handlePrimaryTabChange}
            />
            <div className={viewMode === 'week-board' || viewMode === 'week-list' ? 'h-[calc(100%-130px)] min-h-[400px]' : ''}>
              {viewMode === 'week-list' || viewMode === 'week-board' || viewMode === 'week-timeline' ? (
                <WeekView
                  weekStart={weekStart}
                  items={calendarItems}
                  categories={categories}
                  viewMode={viewMode}
                  listOptions={listOptions}
                  onItemTap={openEditModal}
                  onToggleComplete={handleToggleComplete}
                />
              ) : viewMode === 'day' ? (
                <DayView
                  date={selectedDay}
                  items={calendarItems}
                  categories={categories}
                  listOptions={listOptions}
                  onItemTap={openEditModal}
                  onToggleComplete={handleToggleComplete}
                />
              ) : viewMode === 'month' ? (
                <MonthView
                  currentDate={monthDate}
                  items={calendarItems}
                  weekStartsOn={calendarPreferences.weekStartsOn}
                  onDaySelect={handleDaySelect}
                  onMonthChange={setMonthDate}
                />
              ) : viewMode === 'agenda' ? (
                <AgendaView
                  items={calendarItems}
                  categories={categories}
                  listOptions={listOptions}
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
            onListOptionsChange={setListOptions}
            onItemTap={openEditModal}
            onToggleComplete={handleToggleComplete}
          />
        )}

        {section === 'board' && (
          <BoardSplitView
            weekStart={weekStart}
            items={displayCalendarItems}
            categories={categories}
            listOptions={listOptions}
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
            onToggleRead={(id) =>
              setEmails((prev) =>
                prev.map((e) => (e.id === id ? { ...e, unread: false } : e)),
              )
            }
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
            onDelete={handleDeleteEmail}
          />
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
            microsoftLoading={microsoftLoading}
            selectedId={noteSelectedId}
            onSelectedIdChange={setNoteSelectedId}
            itemShares={itemShares}
            onShareUpdate={handleShareUpdate}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onOpenSettings={() => setSection('settings')}
            onShowToast={setToastMessage}
          />
        )}

        {section === 'today' && (
          <TodayView
            items={displayCalendarItems}
            categories={categories}
            listOptions={listOptions}
            onListOptionsChange={setListOptions}
            onItemTap={openEditModal}
            onToggleComplete={handleToggleComplete}
          />
        )}

        {section === 'settings' && (
          <SettingsView
            categories={categories}
            items={displayCalendarItems}
            listOptions={listOptions}
            onListOptionsChange={setListOptions}
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
            onOpenBoard={() => setSection('board')}
            onEnterKiosk={() => setKioskMode(true)}
            sharedBoardCount={sharedBoardItems.length}
            authEnabled={config?.enabled ?? false}
            authUser={user}
            onAuthUserUpdated={setUser}
            onLogout={config?.enabled ? logout : undefined}
            onOpenSuperAdmin={
              user?.isSuperAdmin ? () => setSection('super-admin') : undefined
            }
          />
        )}

        {section === 'super-admin' && user?.isSuperAdmin && (
          <SuperAdminView onBack={() => setSection('settings')} />
        )}
      </main>

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
        active={section === 'super-admin' ? 'settings' : section}
        onChange={setSection}
        unreadEmails={unreadCount}
      />

      <ItemFormModal
        open={modalOpen}
        item={editingItem}
        categories={categories}
        defaultDate={section === 'today' ? new Date() : selectedDay}
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
  )
}
