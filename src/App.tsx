import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { CreateLinkInput, EntityType, ItemLink } from '../shared/links'
import type { ItemShare, UpsertItemShareInput } from '../shared/itemShares'
import type { BoardPin } from '../shared/boardPins'
import type { SharedBoardItem } from '../shared/boardPins'
import type { Attachment } from '../shared/attachments'
import type { AppSection, CalendarItem, CalendarViewMode, Category, EmailMessage, CalendarFilter } from './types'
import { DEFAULT_LIST_OPTIONS, type ListDisplayOptions } from './types'
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
  getActiveMember,
  loadHouseholdPermissions,
  saveHouseholdPermissions,
  type HouseholdPermissionsConfig,
} from './lib/householdPermissions'
import { calendarFilterMatchesItem } from './components/CalendarAccountFilter'
import {
  createMicrosoftTodo,
  fetchMicrosoftMail,
  fetchMicrosoftStatus,
  mergeGraphMail,
  syncCalendarToMicrosoft,
} from './lib/microsoft'
import type { MicrosoftIntegrationStatus } from '../shared/microsoftGraph'
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
import { LinkExistingModal } from './components/LinkExistingModal'
import { PlannerView } from './components/PlannerView'
import { SettingsView } from './components/SettingsView'
import { BoardSplitView } from './components/BoardSplitView'
import { FamilyBoardView } from './components/FamilyBoardView'
import { EmailActionFlowModal } from './components/EmailActionFlowModal'
import { Toast } from './components/Toast'
import { KioskPinGate } from './components/KioskPinGate'

export default function App() {
  const [section, setSection] = useState<AppSection>('calendar')
  const [categories, setCategories] = useState<Category[]>(
    () => loadStoredCategories() ?? DEFAULT_CATEGORIES,
  )
  const [items, setItems] = useState<CalendarItem[]>(initialItems)
  const [emails, setEmails] = useState(initialEmails)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week-list')
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [monthDate, setMonthDate] = useState(new Date())

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null)
  const [listOptions, setListOptions] = useState<ListDisplayOptions>(DEFAULT_LIST_OPTIONS)
  const [links, setLinks] = useState<ItemLink[]>([])
  const [itemShares, setItemShares] = useState<ItemShare[]>([])
  const [boardPins, setBoardPins] = useState<BoardPin[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [kioskMode, setKioskMode] = useState(false)
  const [kioskPinGateOpen, setKioskPinGateOpen] = useState(false)
  const [emailSelectedId, setEmailSelectedId] = useState<string | null>(null)
  const [linkPicker, setLinkPicker] = useState<{
    sourceType: EntityType
    sourceId: string
    sourceLabel: string
  } | null>(null)
  const [emailActionFlowEmail, setEmailActionFlowEmail] = useState<EmailMessage | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>(() => loadCalendarFilter())
  const [permissionsConfig, setPermissionsConfig] = useState<HouseholdPermissionsConfig>(() =>
    loadHouseholdPermissions(),
  )
  const [microsoftStatus, setMicrosoftStatus] = useState<MicrosoftIntegrationStatus | null>(null)
  const [microsoftLoading, setMicrosoftLoading] = useState(true)
  const [graphEmails, setGraphEmails] = useState<EmailMessage[]>([])

  const refreshMicrosoft = useCallback(async () => {
    setMicrosoftLoading(true)
    try {
      const status = await fetchMicrosoftStatus()
      setMicrosoftStatus(status)
      if (status.accounts[0]) {
        const mail = await fetchMicrosoftMail(status.accounts[0].id)
        setGraphEmails(mail)
      } else {
        setGraphEmails([])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setMicrosoftLoading(false)
    }
  }, [])

  const displayEmails = useMemo(
    () => mergeGraphMail(emails, graphEmails),
    [emails, graphEmails],
  )

  const activeMember = useMemo(() => getActiveMember(permissionsConfig), [permissionsConfig])
  const canDismissVoicePins = memberCan(activeMember, permissionsConfig, 'dismissVoicePins')
  const canManageBoardLayout = memberCan(activeMember, permissionsConfig, 'manageBoardLayout')

  const calendarItems = useMemo(() => {
    if (calendarFilter.mode === 'merged') return items
    return items.filter((item) => calendarFilterMatchesItem(calendarFilter, item.accountId))
  }, [items, calendarFilter])

  const unreadCount = useMemo(() => displayEmails.filter((e) => e.unread).length, [displayEmails])

  useEffect(() => {
    saveStoredCategories(categories)
  }, [categories])

  useEffect(() => {
    saveCalendarFilter(calendarFilter)
  }, [calendarFilter])

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
  }, [refreshMicrosoft])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sectionParam = params.get('section')
    if (
      sectionParam === 'calendar' ||
      sectionParam === 'planner' ||
      sectionParam === 'board' ||
      sectionParam === 'email' ||
      sectionParam === 'today' ||
      sectionParam === 'settings'
    ) {
      setSection(sectionParam)
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

    if (params.has('section') || params.has('microsoft')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [refreshMicrosoft])

  const sharedBoardItems = useMemo(
    () => resolveSharedBoardItems(itemShares, items, emails, categories, attachments),
    [itemShares, items, emails, categories, attachments],
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
          setToastMessage('Folder link (mock) — connect OneDrive in a later phase.')
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
      handleNavigateLink(item.itemType, item.itemId)
    },
    [handleNavigateLink],
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
        accountId: calendarAccountForCategory(taskCategory.id),
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
      const folder = options.folderId ? getMockCloudFolder(options.folderId) : undefined

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
          accountId: calendarAccountForCategory(eventCategory.id),
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
          accountId: calendarAccountForCategory(taskCategory.id),
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
        setToastMessage(
          folder
            ? `Email copied to ${folder.label} (mock)`
            : 'Email copied to folder (mock)',
        )
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
    [categories, handleCreateLink, handleShareUpdate],
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
      const normalized = {
        ...item,
        accountId: item.accountId ?? calendarAccountForCategory(item.categoryId),
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

      const microsoftAccount = microsoftStatus?.accounts[0]
      if (!microsoftAccount) return

      const category = categories.find((entry) => entry.id === normalized.categoryId)
      const linkType = getItemLinkType(normalized, categories)
      const photoAttachment = attachments.find(
        (entry) =>
          entry.itemType === linkType &&
          entry.itemId === normalized.id &&
          entry.kind === 'photo',
      )

      try {
        if (category?.kind === 'task') {
          await createMicrosoftTodo(microsoftAccount.id, {
            title: normalized.title,
            dueDate: normalized.date,
            notes: normalized.notes,
          })
          setToastMessage('Task synced to Microsoft To Do')
          return
        }

        const result = await syncCalendarToMicrosoft(
          microsoftAccount.id,
          normalized,
          photoAttachment
            ? {
                storageKey: photoAttachment.storageKey,
                mimeType: photoAttachment.mimeType,
                filename: photoAttachment.filename,
              }
            : undefined,
        )
        setItems((prev) =>
          prev.map((entry) =>
            entry.id === normalized.id
              ? {
                  ...entry,
                  externalId: result.externalId,
                  provider: 'microsoft',
                  connectedAccountId: microsoftAccount.id,
                }
              : entry,
          ),
        )
        setToastMessage('Synced to Outlook calendar')
      } catch (error) {
        console.error(error)
        setToastMessage(
          error instanceof Error ? error.message : 'Saved locally; Outlook sync failed',
        )
      }
    },
    [attachments, categories, microsoftStatus],
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

  const goToday = () => {
    const today = new Date()
    setWeekStart(startOfWeek(today))
    setSelectedDay(today)
    setMonthDate(today)
  }

  const handleDaySelect = (date: Date) => {
    setSelectedDay(date)
    setViewMode('day')
  }

  const handlePrimaryTabChange = (tab: PrimaryCalendarTab) => {
    if (tab === 'week') {
      setViewMode('week-list')
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
          items={items}
          emails={emails}
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
            items={items}
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
            items={items}
            categories={categories}
            listOptions={listOptions}
            sharedItems={sharedBoardItems}
            pins={boardPins}
            links={links}
            emails={emails}
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
            selectedId={emailSelectedId}
            onSelectedIdChange={setEmailSelectedId}
            links={links}
            items={items}
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
          />
        )}

        {section === 'today' && (
          <TodayView
            items={items}
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
            items={items}
            listOptions={listOptions}
            onListOptionsChange={setListOptions}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
            permissionsConfig={permissionsConfig}
            onPermissionsChange={setPermissionsConfig}
            microsoftStatus={microsoftStatus}
            microsoftLoading={microsoftLoading}
            onMicrosoftRefresh={refreshMicrosoft}
            onOpenBoard={() => setSection('board')}
            onEnterKiosk={() => setKioskMode(true)}
            sharedBoardCount={sharedBoardItems.length}
          />
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

      <BottomNav active={section} onChange={setSection} unreadEmails={unreadCount} />

      <ItemFormModal
        open={modalOpen}
        item={editingItem}
        categories={categories}
        defaultDate={section === 'today' ? new Date() : selectedDay}
        links={links}
        emails={emails}
        items={items}
        attachments={attachments}
        onAttachmentUploaded={handleAttachmentUploaded}
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
        items={items}
        categories={categories}
        emails={emails}
        links={links}
        onClose={() => setLinkPicker(null)}
        onSelect={handleLinkExistingSelect}
      />

      <EmailActionFlowModal
        open={emailActionFlowEmail !== null}
        email={emailActionFlowEmail}
        defaultDueDate="2026-06-30"
        onClose={() => setEmailActionFlowEmail(null)}
        onSubmit={handleEmailActionFlow}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  )
}
