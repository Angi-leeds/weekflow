import { useEffect, useMemo, useState } from 'react'
import { Link2 } from 'lucide-react'
import type { Attachment } from '../../shared/attachments'
import type { EntityType, ItemLink } from '../../shared/links'
import type { ItemShare, UpsertItemShareInput } from '../../shared/itemShares'
import type { GraphCalendarDto, GraphTodoListDto } from '../../shared/microsoftGraph'
import type { GoogleCalendarDto } from '../../shared/googleApi'
import type { CalendarItem, Category, EmailMessage, IntegrationAccountDefaults, ItemReminderPreset, ItemShowInDiaryMode, SaveItemOptions, CalendarPreferences } from '../types'
import { ITEM_REMINDER_PRESET_LABELS, DEFAULT_CALENDAR_PREFERENCES } from '../types'
import { isTaskCategory, resolveItemColour } from '../categories'
import { generateId, toISODate } from '../dateUtils'
import { ITEM_FORM_DIARY } from '../lib/diaryHelpCopy'
import { resolveItemDiaryVisibility } from '../lib/diaryVisibility'
import { deriveAllDayFromTimes, normalizeItemSchedule } from '../lib/itemTimeHelpers'
import { getItemLinkType } from '../lib/itemLinkHelpers'
import { getPhotoUrlForItem, uploadAttachment } from '../lib/attachments'
import { getMicrosoftSchedule, respondToMicrosoftCalendarEvent } from '../lib/microsoft'
import {
  ITEM_REMINDER_PRESET_OPTIONS,
  joinReminderAt,
  splitReminderAt,
  hasActiveReminder,
} from '../lib/reminderHelpers'
import { isTaskOrReminder } from './itemHelpers'
import { LinkChips } from './LinkChips'
import { ShareToBoardFields, shareStateFromRecord } from './ShareToBoardFields'

interface ItemFormModalProps {
  open: boolean
  item?: CalendarItem | null
  categories: Category[]
  defaultDate?: Date
  links: ItemLink[]
  emails: EmailMessage[]
  items: CalendarItem[]
  attachments: Attachment[]
  onAttachmentUploaded: (attachment: Attachment) => void
  itemShare?: ItemShare
  onShareUpdate: (input: UpsertItemShareInput) => void
  onSave: (item: CalendarItem, options?: SaveItemOptions) => void
  onDelete?: (id: string) => void
  onClose: () => void
  onNavigateLink: (type: EntityType, id: string) => void
  onLinkExisting?: () => void
  onRemoveLink?: (linkId: string) => void
  usingRealMicrosoft?: boolean
  usingRealGoogle?: boolean
  microsoftCalendars?: GraphCalendarDto[]
  googleCalendars?: GoogleCalendarDto[]
  microsoftTodoLists?: GraphTodoListDto[]
  integrationAccountDefaults?: IntegrationAccountDefaults
  connectedAccountEmails?: Record<string, string>
  calendarPreferences?: CalendarPreferences
}

const emptyForm = (date: Date, categories: Category[]): CalendarItem => {
  const defaultCat = categories.find((c) => c.id === 'appointment') ?? categories[0]
  const isEvent = defaultCat.kind === 'event'
  return {
    id: '',
    title: '',
    date: toISODate(date),
    allDay: isEvent,
    categoryId: defaultCat.id,
    colour: defaultCat.colour,
    notes: '',
    completed: false,
  }
}

function preferGoogleCalendarDefaults(
  defaults: IntegrationAccountDefaults | undefined,
  usingRealMicrosoft: boolean,
  usingRealGoogle: boolean,
): boolean {
  if (!usingRealGoogle) return false
  if (!usingRealMicrosoft) return true
  if (defaults?.defaultGoogleAccountId && !defaults?.defaultMicrosoftAccountId) return true
  return false
}

function applyIntegrationDefaults(
  base: CalendarItem,
  categories: Category[],
  usingRealMicrosoft: boolean,
  usingRealGoogle: boolean,
  microsoftCalendars: GraphCalendarDto[],
  googleCalendars: GoogleCalendarDto[],
  microsoftTodoLists: GraphTodoListDto[],
  integrationAccountDefaults?: IntegrationAccountDefaults,
): CalendarItem {
  if (isTaskCategory(categories, base.categoryId) && usingRealMicrosoft) {
    const defaultAccountId =
      integrationAccountDefaults?.defaultMicrosoftAccountId ??
      microsoftCalendars[0]?.connectedAccountId ??
      microsoftTodoLists[0]?.connectedAccountId

    const preferredList =
      microsoftTodoLists.find(
        (list) =>
          list.graphListId === integrationAccountDefaults?.tasks?.defaultTodoListId &&
          list.connectedAccountId === defaultAccountId,
      ) ??
      microsoftTodoLists.find(
        (list) => list.connectedAccountId === defaultAccountId && list.isDefault,
      ) ??
      microsoftTodoLists.find((list) => list.connectedAccountId === defaultAccountId)
    if (!preferredList) return base
    return {
      ...base,
      todoListId: preferredList.graphListId,
      accountId: preferredList.accountId,
      connectedAccountId: preferredList.connectedAccountId,
    }
  }

  if (preferGoogleCalendarDefaults(integrationAccountDefaults, usingRealMicrosoft, usingRealGoogle)) {
    const defaultAccountId =
      integrationAccountDefaults?.defaultGoogleAccountId ??
      googleCalendars[0]?.connectedAccountId
    const preferredCalendar =
      googleCalendars.find(
        (calendar) =>
          calendar.googleCalendarId ===
            integrationAccountDefaults?.googleCalendar?.defaultCalendarId &&
          calendar.connectedAccountId === defaultAccountId,
      ) ??
      googleCalendars.find(
        (calendar) => calendar.connectedAccountId === defaultAccountId && calendar.isDefault,
      ) ??
      googleCalendars.find((calendar) => calendar.connectedAccountId === defaultAccountId)
    if (!preferredCalendar) return base
    return {
      ...base,
      calendarId: preferredCalendar.googleCalendarId,
      calendarName: preferredCalendar.name,
      accountId: preferredCalendar.accountId,
      connectedAccountId: preferredCalendar.connectedAccountId,
      provider: 'google',
    }
  }

  if (!usingRealMicrosoft) return base

  const defaultAccountId =
    integrationAccountDefaults?.defaultMicrosoftAccountId ??
    microsoftCalendars[0]?.connectedAccountId ??
    microsoftTodoLists[0]?.connectedAccountId

  const preferredCalendar =
    microsoftCalendars.find(
      (calendar) =>
        calendar.graphCalendarId === integrationAccountDefaults?.calendar?.defaultCalendarId &&
        calendar.connectedAccountId === defaultAccountId,
    ) ??
    microsoftCalendars.find(
      (calendar) => calendar.connectedAccountId === defaultAccountId && calendar.isDefault,
    ) ??
    microsoftCalendars.find((calendar) => calendar.connectedAccountId === defaultAccountId)
  if (!preferredCalendar) return base
  return {
    ...base,
    calendarId: preferredCalendar.graphCalendarId,
    calendarName: preferredCalendar.name,
    accountId: preferredCalendar.accountId,
    connectedAccountId: preferredCalendar.connectedAccountId,
    provider: 'microsoft',
  }
}

export function ItemFormModal({
  open,
  item,
  categories,
  defaultDate = new Date(),
  links,
  emails,
  items,
  attachments,
  onAttachmentUploaded,
  itemShare,
  onShareUpdate,
  onSave,
  onDelete,
  onClose,
  onNavigateLink,
  onLinkExisting,
  onRemoveLink,
  usingRealMicrosoft = false,
  usingRealGoogle = false,
  microsoftCalendars = [],
  googleCalendars = [],
  microsoftTodoLists = [],
  integrationAccountDefaults,
  connectedAccountEmails = {},
  calendarPreferences = DEFAULT_CALENDAR_PREFERENCES,
}: ItemFormModalProps) {
  const [form, setForm] = useState<CalendarItem>(() => emptyForm(defaultDate, categories))
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showInDiaryMode, setShowInDiaryMode] = useState<ItemShowInDiaryMode>('category')
  const [createLinkedTask, setCreateLinkedTask] = useState(false)
  const [linkedTaskCategoryId, setLinkedTaskCategoryId] = useState('')
  const [createLinkedCalendarEvent, setCreateLinkedCalendarEvent] = useState(false)
  const [linkedEventCategoryId, setLinkedEventCategoryId] = useState('appointment')

  const taskCategories = useMemo(
    () => categories.filter((cat) => cat.kind === 'task' || cat.kind === 'reminder'),
    [categories],
  )
  const eventCategories = useMemo(
    () => categories.filter((cat) => cat.kind === 'event'),
    [categories],
  )
  const defaultLinkedTaskCategoryId =
    taskCategories.find((cat) => cat.showInDiary)?.id ?? taskCategories[0]?.id ?? 'task'
  const defaultLinkedEventCategoryId =
    eventCategories.find((cat) => cat.id === 'appointment')?.id ??
    eventCategories[0]?.id ??
    'appointment'

  useEffect(() => {
    if (!open) return
    if (item?.id) {
      setForm(normalizeItemSchedule({ ...item }, categories))
      setShowInDiaryMode(
        item.showInDiary === true
          ? 'always'
          : item.showInDiary === false
            ? 'never'
            : 'category',
      )
    } else {
      const base = emptyForm(defaultDate, categories)
      setForm(
        applyIntegrationDefaults(
          base,
          categories,
          usingRealMicrosoft,
          usingRealGoogle,
          microsoftCalendars,
          googleCalendars,
          microsoftTodoLists,
          integrationAccountDefaults,
        ),
      )
      setShowInDiaryMode('category')
    }
    setCreateLinkedTask(false)
    setCreateLinkedCalendarEvent(false)
    setLinkedTaskCategoryId(defaultLinkedTaskCategoryId)
    setLinkedEventCategoryId(defaultLinkedEventCategoryId)
  }, [
    open,
    item,
    defaultDate,
    categories,
    usingRealMicrosoft,
    usingRealGoogle,
    microsoftCalendars,
    googleCalendars,
    microsoftTodoLists,
    integrationAccountDefaults,
    defaultLinkedTaskCategoryId,
    defaultLinkedEventCategoryId,
  ])

  const isEdit = Boolean(item?.id)
  const isTask = isTaskCategory(categories, form.categoryId)

  const googleCalendarOptions = useMemo(
    () =>
      googleCalendars.map((calendar) => ({
        value: calendar.googleCalendarId,
        label: `${calendar.name}${calendar.isDefault ? ' (primary)' : ''}`,
        calendar,
      })),
    [googleCalendars],
  )

  const calendarOptions = useMemo(
    () =>
      microsoftCalendars.map((calendar) => ({
        value: calendar.graphCalendarId,
        label: `${calendar.name}${calendar.isDefault ? ' (default)' : ''}`,
        calendar,
      })),
    [microsoftCalendars],
  )

  const todoListOptions = useMemo(
    () =>
      microsoftTodoLists.map((list) => ({
        value: list.graphListId,
        label: `${list.name}${list.isDefault ? ' (default)' : ''}`,
        list,
      })),
    [microsoftTodoLists],
  )

  const accountLabel = (connectedAccountId: string) =>
    connectedAccountEmails[connectedAccountId] ?? 'Account'

  if (!open) return null

  const entityType = form.id ? getItemLinkType(form, categories) : null
  const shareState = shareStateFromRecord(itemShare)
  const photoUrl =
    (entityType && form.id
      ? getPhotoUrlForItem(attachments, entityType, form.id)
      : undefined) ?? form.photoUrl

  const handlePhotoUpload = async (file: File) => {
    setUploadError(null)
    const itemId = form.id || generateId()
    if (!form.id) {
      setForm((prev) => ({ ...prev, id: itemId }))
    }

    const linkType = getItemLinkType({ ...form, id: itemId }, categories)
    setUploadingPhoto(true)
    try {
      const attachment = await uploadAttachment(file, linkType, itemId, 'photo')
      onAttachmentUploaded(attachment)
      setForm((prev) => ({ ...prev, photoUrl: attachment.url }))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const endDate =
      form.endDate && form.endDate > form.date ? form.endDate : undefined
    const itemIsTask = isTaskOrReminder(form, categories)
    const showInDiary =
      showInDiaryMode === 'category' ? null : showInDiaryMode === 'always' ? true : false
    const savedItem = normalizeItemSchedule(
      {
        ...form,
        id: form.id || generateId(),
        title: form.title.trim(),
        endDate,
        colour: resolveItemColour(categories, form.categoryId),
        completed: itemIsTask ? form.completed : undefined,
        showInDiary: itemIsTask ? showInDiary : undefined,
      },
      categories,
    )
    const options: SaveItemOptions = {}
    if (!isEdit && !isTask && hasActiveReminder(savedItem) && createLinkedTask && linkedTaskCategoryId) {
      options.createLinkedTask = { categoryId: linkedTaskCategoryId }
    }
    if (
      !isEdit &&
      isTask &&
      hasActiveReminder(savedItem) &&
      createLinkedCalendarEvent &&
      linkedEventCategoryId
    ) {
      options.createLinkedCalendarEvent = { categoryId: linkedEventCategoryId }
    }
    onSave(savedItem, Object.keys(options).length > 0 ? options : undefined)
    onClose()
  }

  const selectedCategory = categories.find((cat) => cat.id === form.categoryId)
  const previewItem: CalendarItem = {
    ...form,
    showInDiary:
      showInDiaryMode === 'category' ? null : showInDiaryMode === 'always' ? true : false,
  }
  const resolvedDiaryVisible = resolveItemDiaryVisibility(
    previewItem,
    categories,
    calendarPreferences,
  )
  const diaryCategoryHint =
    showInDiaryMode === 'category' && selectedCategory
      ? resolvedDiaryVisible
        ? ITEM_FORM_DIARY.visibilityCategoryOn(selectedCategory.name)
        : ITEM_FORM_DIARY.visibilityCategoryOff(selectedCategory.name)
      : null

  const selectCategory = (categoryId: string) => {
    const match = categories.find((entry) => entry.id === categoryId)
    const next = {
      ...form,
      categoryId,
      colour: resolveItemColour(categories, categoryId),
      calendarId: undefined,
      calendarName: undefined,
      todoListId: undefined,
      outlookCategories:
        usingRealMicrosoft && match && !isTask ? [match.name] : form.outlookCategories,
    }
    setForm(
      normalizeItemSchedule(
        applyIntegrationDefaults(
          next,
          categories,
          usingRealMicrosoft,
          usingRealGoogle,
          microsoftCalendars,
          googleCalendars,
          microsoftTodoLists,
          integrationAccountDefaults,
        ),
        categories,
      ),
    )
  }

  const clearOutlookCategory = () => {
    setForm((prev) => ({
      ...prev,
      outlookCategories: [],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 animate-fade-in backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 flex w-full max-w-lg max-h-[min(92dvh,100%)] flex-col animate-slide-up rounded-t-3xl bg-wf-surface shadow-[var(--shadow-modal)] safe-bottom sm:mx-4 sm:max-h-[min(88dvh,900px)] sm:rounded-3xl">
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-wf-border sm:hidden" />

          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[20px] font-bold">
              {isEdit ? 'Edit item' : 'New item'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-[15px] font-medium text-wf-accent"
            >
              Cancel
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-8 [-webkit-overflow-scrolling:touch]"
        >
          <Field label="Title">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Event or task name"
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-[16px] outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    date: e.target.value,
                    endDate:
                      form.endDate && form.endDate < e.target.value
                        ? undefined
                        : form.endDate,
                  })
                }
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={form.endDate ?? ''}
                min={form.date}
                onChange={(e) =>
                  setForm({ ...form, endDate: e.target.value || undefined })
                }
                disabled={!form.allDay}
                placeholder="Optional"
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent disabled:opacity-40"
              />
            </Field>
          </div>

          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {usingRealMicrosoft && !isTask && (
                <button
                  type="button"
                  onClick={clearOutlookCategory}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-body transition-all active:scale-[0.98] ${
                    (form.outlookCategories?.length ?? 0) === 0
                      ? 'border-wf-accent bg-wf-accent-soft font-medium text-wf-accent'
                      : 'border-wf-border bg-wf-bg text-wf-text hover:border-wf-accent/30'
                  }`}
                >
                  None
                </button>
              )}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-body transition-all active:scale-[0.98] ${
                    form.categoryId === cat.id &&
                    (form.outlookCategories?.length ?? 0) !== 0
                      ? 'border-wf-accent bg-wf-accent-soft font-medium text-wf-accent'
                      : 'border-wf-border bg-wf-bg text-wf-text hover:border-wf-accent/30'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.colour }}
                  />
                  {cat.name}
                </button>
              ))}
            </div>
          </Field>

          {usingRealMicrosoft && isTask && todoListOptions.length > 0 && (
            <Field label="Save to To Do list">
              <select
                value={form.todoListId ?? ''}
                onChange={(e) => {
                  const list = microsoftTodoLists.find(
                    (entry) => entry.graphListId === e.target.value,
                  )
                  if (!list) return
                  setForm({
                    ...form,
                    todoListId: list.graphListId,
                    accountId: list.accountId,
                    connectedAccountId: list.connectedAccountId,
                  })
                }}
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
              >
                {todoListOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {accountLabel(option.list.connectedAccountId)} · {option.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {usingRealMicrosoft && !isTask && calendarOptions.length > 0 && (
            <Field label="Save to Outlook calendar">
              <select
                value={form.provider === 'google' ? '' : (form.calendarId ?? '')}
                onChange={(e) => {
                  const calendar = microsoftCalendars.find(
                    (entry) => entry.graphCalendarId === e.target.value,
                  )
                  if (!calendar) return
                  setForm({
                    ...form,
                    calendarId: calendar.graphCalendarId,
                    calendarName: calendar.name,
                    accountId: calendar.accountId,
                    connectedAccountId: calendar.connectedAccountId,
                    provider: 'microsoft',
                  })
                }}
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
              >
                {calendarOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {accountLabel(option.calendar.connectedAccountId)} · {option.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {usingRealGoogle && !isTask && googleCalendarOptions.length > 0 && (
            <Field label="Save to Google calendar">
              <select
                value={form.provider === 'google' ? (form.calendarId ?? '') : ''}
                onChange={(e) => {
                  const calendar = googleCalendars.find(
                    (entry) => entry.googleCalendarId === e.target.value,
                  )
                  if (!calendar) return
                  setForm({
                    ...form,
                    calendarId: calendar.googleCalendarId,
                    calendarName: calendar.name,
                    accountId: calendar.accountId,
                    connectedAccountId: calendar.connectedAccountId,
                    provider: 'google',
                  })
                }}
                className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
              >
                <option value="">Select Google calendar…</option>
                {googleCalendarOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {accountLabel(option.calendar.connectedAccountId)} · {option.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {deriveAllDayFromTimes(form, categories, form.allDay) && !form.endDate && (
            <p className="text-caption text-wf-text-tertiary">
              Leave end date empty for a single-day event, or set it to span multiple days.
            </p>
          )}

          <label className="flex items-center gap-3 rounded-xl bg-wf-bg px-4 py-3">
            <input
              type="checkbox"
              checked={deriveAllDayFromTimes(form, categories, form.allDay)}
              onChange={(e) =>
                setForm({
                  ...form,
                  allDay: e.target.checked,
                  startTime: e.target.checked ? undefined : form.startTime,
                  endTime: e.target.checked ? undefined : form.endTime,
                  endDate: e.target.checked ? form.endDate : undefined,
                })
              }
              className="h-5 w-5 rounded accent-wf-accent"
            />
            <span>
              <span className="block text-[15px] font-medium">All day</span>
              {!isTask && (
                <span className="mt-0.5 block text-caption text-wf-text-tertiary">
                  Leave times blank below and this stays on — syncs as all-day to Outlook and Google.
                </span>
              )}
            </span>
          </label>

          {!deriveAllDayFromTimes(form, categories, form.allDay) && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <input
                  type="time"
                  value={form.startTime ?? ''}
                  onChange={(e) => {
                    const startTime = e.target.value || undefined
                    setForm((prev) => ({
                      ...prev,
                      startTime,
                      allDay: deriveAllDayFromTimes(
                        { ...prev, startTime },
                        categories,
                        prev.allDay,
                      ),
                    }))
                  }}
                  className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-[15px] outline-none focus:border-wf-accent"
                />
              </Field>
              <Field label="End">
                <input
                  type="time"
                  value={form.endTime ?? ''}
                  onChange={(e) => {
                    const endTime = e.target.value || undefined
                    setForm((prev) => ({
                      ...prev,
                      endTime,
                      allDay: deriveAllDayFromTimes(
                        { ...prev, endTime },
                        categories,
                        prev.allDay,
                      ),
                    }))
                  }}
                  className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-[15px] outline-none focus:border-wf-accent"
                />
              </Field>
            </div>
          )}

          <ReminderFields form={form} onChange={setForm} defaultDate={form.date} />

          {(isTask || isTaskOrReminder(form, categories)) && (
            <div className="space-y-2 rounded-xl bg-wf-bg px-4 py-3">
              <p className="text-subhead font-semibold text-wf-text">{ITEM_FORM_DIARY.visibilityTitle}</p>
              <select
                value={showInDiaryMode}
                onChange={(e) => setShowInDiaryMode(e.target.value as ItemShowInDiaryMode)}
                className="w-full rounded-xl border border-wf-border bg-wf-surface px-3 py-2.5 text-body outline-none focus:border-wf-accent"
              >
                <option value="category">{ITEM_FORM_DIARY.visibilityCategory}</option>
                <option value="always">{ITEM_FORM_DIARY.visibilityAlways}</option>
                <option value="never">{ITEM_FORM_DIARY.visibilityNever}</option>
              </select>
              <p className="text-caption text-wf-text-tertiary">
                {showInDiaryMode === 'category' && diaryCategoryHint}
                {showInDiaryMode === 'always' && ITEM_FORM_DIARY.visibilityAlwaysHelp}
                {showInDiaryMode === 'never' && ITEM_FORM_DIARY.visibilityNeverHelp}
              </p>
              <p className="text-caption text-wf-text-tertiary">{ITEM_FORM_DIARY.visibilityPlannerNote}</p>
            </div>
          )}

          {hasActiveReminder(form) && (
            <p className="rounded-xl bg-wf-bg px-4 py-3 text-caption text-wf-text-tertiary">
              {ITEM_FORM_DIARY.reminderNote}
            </p>
          )}

          {!isEdit && !isTask && hasActiveReminder(form) && (
            <div className="space-y-2 rounded-xl bg-wf-bg px-4 py-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={createLinkedTask}
                  onChange={(e) => setCreateLinkedTask(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded accent-wf-accent"
                />
                <span>
                  <span className="block text-[15px] font-medium text-wf-text">
                    {ITEM_FORM_DIARY.createLinkedTaskLabel}
                  </span>
                  <span className="mt-0.5 block text-caption text-wf-text-tertiary">
                    {ITEM_FORM_DIARY.createLinkedTaskHelp}
                  </span>
                </span>
              </label>
              {createLinkedTask && (
                <select
                  value={linkedTaskCategoryId}
                  onChange={(e) => setLinkedTaskCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-wf-border bg-wf-surface px-3 py-2.5 text-body outline-none focus:border-wf-accent"
                >
                  {taskCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {!isEdit && isTask && hasActiveReminder(form) && (
            <div className="space-y-2 rounded-xl bg-wf-bg px-4 py-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={createLinkedCalendarEvent}
                  onChange={(e) => setCreateLinkedCalendarEvent(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded accent-wf-accent"
                />
                <span>
                  <span className="block text-[15px] font-medium text-wf-text">
                    {ITEM_FORM_DIARY.createLinkedEventLabel}
                  </span>
                  <span className="mt-0.5 block text-caption text-wf-text-tertiary">
                    {ITEM_FORM_DIARY.createLinkedEventHelp}
                  </span>
                </span>
              </label>
              {createLinkedCalendarEvent && (
                <select
                  value={linkedEventCategoryId}
                  onChange={(e) => setLinkedEventCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-wf-border bg-wf-surface px-3 py-2.5 text-body outline-none focus:border-wf-accent"
                >
                  {eventCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {usingRealMicrosoft && !isTask && (
            <>
              <Field label="Attendees (emails, comma-separated)">
                <input
                  type="text"
                  value={(form.attendees ?? []).join(', ')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      attendees: e.target.value
                        .split(/[,;]/)
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="colleague@company.com, friend@example.com"
                  className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-body outline-none focus:border-wf-accent"
                />
              </Field>
              <label className="flex items-center gap-3 rounded-xl bg-wf-bg px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(form.recurringWeekly)}
                  onChange={(e) => setForm({ ...form, recurringWeekly: e.target.checked })}
                  className="h-5 w-5 rounded accent-wf-accent"
                />
                <span className="text-[15px] font-medium">Repeat weekly (10 times)</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl bg-wf-bg px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(form.teamsMeeting)}
                  onChange={(e) => setForm({ ...form, teamsMeeting: e.target.checked })}
                  className="h-5 w-5 rounded accent-wf-accent"
                />
                <span className="text-[15px] font-medium">Teams online meeting</span>
              </label>
              {form.onlineMeetingUrl && (
                <a
                  href={form.onlineMeetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl bg-[#464775]/10 px-4 py-3 text-subhead font-semibold text-[#464775]"
                >
                  Join Teams meeting
                </a>
              )}
              {form.externalId && form.connectedAccountId && (
                <div className="flex flex-wrap gap-2">
                  {(['accept', 'tentativelyAccept', 'decline'] as const).map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() =>
                        void respondToMicrosoftCalendarEvent(
                          form.connectedAccountId!,
                          form.externalId!,
                          action,
                        ).then(() => setForm({ ...form, inviteResponse: action === 'tentativelyAccept' ? 'tentativelyAccepted' : action }))
                      }
                      className="rounded-xl border border-wf-border px-3 py-2 text-caption font-semibold capitalize"
                    >
                      {action === 'tentativelyAccept' ? 'Tentative' : action}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <Field label="Notes">
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Optional notes"
              className="w-full resize-none rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-[15px] outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
            />
          </Field>

          <Field label="Photo attachment">
            {photoUrl ? (
              <div className="space-y-2">
                <img
                  src={photoUrl}
                  alt="Attachment preview"
                  className="max-h-40 w-full rounded-xl object-cover"
                />
                <p className="text-caption text-wf-text-tertiary">
                  Stored via attachment API{uploadingPhoto ? ' — uploading…' : ''}
                </p>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPhoto}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handlePhotoUpload(file)
                }}
                className="w-full text-body file:mr-3 file:rounded-lg file:border-0 file:bg-wf-accent-soft file:px-3 file:py-2 file:text-subhead file:font-semibold file:text-wf-accent disabled:opacity-50"
              />
            )}
            {uploadError && (
              <p className="mt-1 text-caption font-medium text-wf-red">{uploadError}</p>
            )}
          </Field>

          {entityType && form.id && (
            <ShareToBoardFields
              sharedToBoard={shareState.sharedToBoard}
              boardDisplay={shareState.boardDisplay}
              onSharedChange={(sharedToBoard) =>
                onShareUpdate({
                  itemType: entityType,
                  itemId: form.id,
                  sharedToBoard,
                  boardDisplay: shareState.boardDisplay,
                })
              }
              onDisplayChange={(boardDisplay) =>
                onShareUpdate({
                  itemType: entityType,
                  itemId: form.id,
                  sharedToBoard: shareState.sharedToBoard,
                  boardDisplay,
                })
              }
            />
          )}

          {entityType && form.id && (
            <div className="space-y-2 rounded-xl bg-wf-bg px-4 py-3">
              {links.some(
                (link) =>
                  (link.fromType === entityType && link.fromId === form.id) ||
                  (link.toType === entityType && link.toId === form.id),
              ) && (
                <p className="text-caption text-wf-text-tertiary">{ITEM_FORM_DIARY.linksCaption}</p>
              )}
              <LinkChips
                entityType={entityType}
                entityId={form.id}
                links={links}
                items={items}
                emails={emails}
                onNavigate={onNavigateLink}
                onRemove={onRemoveLink}
              />
              {onLinkExisting && (
                <button
                  type="button"
                  onClick={onLinkExisting}
                  className="inline-flex items-center gap-2 text-subhead font-medium text-wf-accent"
                >
                  <Link2 size={16} strokeWidth={2} />
                  Link to existing…
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-wf-accent py-3.5 text-[16px] font-semibold text-white shadow-lg shadow-wf-accent/25 transition-transform active:scale-[0.98]"
          >
            {isEdit ? 'Save changes' : 'Add item'}
          </button>

          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(form.id)
                onClose()
              }}
              className="w-full rounded-2xl py-3 text-[15px] font-medium text-wf-red"
            >
              Delete item
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-wf-text-secondary">{label}</span>
      {children}
    </label>
  )
}

type CustomReminderUnit = 'minutes' | 'hours' | 'days'

function customUnitFromMinutes(minutes: number): { amount: number; unit: CustomReminderUnit } {
  if (minutes > 0 && minutes % (24 * 60) === 0) {
    return { amount: minutes / (24 * 60), unit: 'days' }
  }
  if (minutes > 0 && minutes % 60 === 0) {
    return { amount: minutes / 60, unit: 'hours' }
  }
  return { amount: minutes || 15, unit: 'minutes' }
}

function minutesFromCustom(amount: number, unit: CustomReminderUnit): number {
  if (unit === 'days') return amount * 24 * 60
  if (unit === 'hours') return amount * 60
  return amount
}

function ReminderFields({
  form,
  onChange,
  defaultDate,
}: {
  form: CalendarItem
  onChange: (next: CalendarItem) => void
  defaultDate: string
}) {
  const preset = form.reminderPreset ?? 'none'
  const custom = customUnitFromMinutes(form.reminderCustomMinutes ?? 15)
  const reminderAtParts = splitReminderAt(form.reminderAt ?? `${defaultDate}T09:00`)

  return (
    <Field label="Reminder">
      <select
        value={preset}
        onChange={(e) => {
          const nextPreset = e.target.value as ItemReminderPreset
          onChange({
            ...form,
            reminderPreset: nextPreset,
            reminderCustomMinutes: nextPreset === 'custom' ? form.reminderCustomMinutes ?? 15 : undefined,
            reminderAt:
              nextPreset === 'datetime'
                ? form.reminderAt ?? joinReminderAt(defaultDate, form.startTime ?? '09:00')
                : undefined,
          })
        }}
        className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
      >
        {ITEM_REMINDER_PRESET_OPTIONS.map((key) => (
          <option key={key} value={key}>
            {ITEM_REMINDER_PRESET_LABELS[key]}
          </option>
        ))}
      </select>

      {preset === 'custom' && (
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <input
            type="number"
            min={0}
            value={custom.amount}
            onChange={(e) => {
              const amount = Math.max(0, Number(e.target.value) || 0)
              onChange({
                ...form,
                reminderCustomMinutes: minutesFromCustom(amount, custom.unit),
              })
            }}
            className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
          />
          <select
            value={custom.unit}
            onChange={(e) => {
              const unit = e.target.value as CustomReminderUnit
              onChange({
                ...form,
                reminderCustomMinutes: minutesFromCustom(custom.amount, unit),
              })
            }}
            className="rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
          >
            <option value="minutes">minutes before</option>
            <option value="hours">hours before</option>
            <option value="days">days before</option>
          </select>
        </div>
      )}

      {preset === 'datetime' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="date"
            value={reminderAtParts.date}
            onChange={(e) =>
              onChange({
                ...form,
                reminderAt: joinReminderAt(e.target.value, reminderAtParts.time),
              })
            }
            className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
          />
          <input
            type="time"
            value={reminderAtParts.time}
            onChange={(e) =>
              onChange({
                ...form,
                reminderAt: joinReminderAt(reminderAtParts.date || defaultDate, e.target.value),
              })
            }
            className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
          />
        </div>
      )}
    </Field>
  )
}
