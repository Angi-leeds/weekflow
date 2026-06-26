import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Archive,
  CheckSquare,
  ChevronLeft,
  ClipboardList,
  Flag,
  FolderInput,
  Link2,
  Mail,
  MailOpen,
  PenLine,
  Reply,
  ReplyAll,
  Search,
  Share2,
  Square,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EntityType, ItemLink } from '../../shared/links'
import {
  enrichEmailHtmlWithInlineAttachments,
  isHtmlEmailBody,
  normalizeEmailBody,
} from '../../shared/emailBody'
import type { BoardDisplay, ItemShare, UpsertItemShareInput } from '../../shared/itemShares'
import type { CalendarItem, EmailMessage, EmailAttachment } from '../types'
import { useIsWide } from '../hooks/useMediaQuery'
import {
  EMAIL_CATEGORIES,
} from '../mockData'
import type { EmailAccount, EmailFolder } from '../types'
import { getShareForEntity } from '../lib/itemShares'
import { icloudMailUrl, openExternalUrl } from '../lib/appleLinks'
import { fetchMicrosoftMessageAttachments, microsoftAttachmentDownloadUrl } from '../lib/microsoft'
import { EmailHtmlBody } from './EmailHtmlBody'
import { IconButton } from './ui/IconButton'
import { LinkChips } from './LinkChips'
import { ShareToBoardFields, shareStateFromRecord } from './ShareToBoardFields'

type InboxFilter =
  | { mode: 'merged' }
  | { mode: 'account'; accountId: string }
  | { mode: 'folder'; folderId: string }

interface EmailViewProps {
  emails: EmailMessage[]
  emailAccounts: EmailAccount[]
  emailFolders: EmailFolder[]
  initialSearch?: string
  onClearInitialSearch?: () => void
  selectedId?: string | null
  onSelectedIdChange?: (id: string | null) => void
  links: ItemLink[]
  items: CalendarItem[]
  itemShares: ItemShare[]
  onShareUpdate: (input: UpsertItemShareInput) => void
  onOpenActionFlow: (email: EmailMessage) => void
  onToggleStar: (id: string) => void
  onToggleRead: (id: string) => void
  onSetReadState?: (id: string, isRead: boolean) => void
  onCreateTask: (email: EmailMessage) => void
  onLinkExisting: (email: EmailMessage) => void
  onNavigateLink: (type: EntityType, id: string) => void
  onRemoveLink?: (linkId: string) => void
  onLoadFolderMessages?: (folder: EmailFolder) => void
  loadingFolderIds?: Set<string>
  usingRealIntegrations?: boolean
  onCompose?: () => void
  onReply?: (email: EmailMessage) => void
  onReplyAll?: (email: EmailMessage) => void
  onForward?: (email: EmailMessage) => void
  onMoveMail?: (email: EmailMessage, destinationFolderGraphId: string) => void
  onServerSearch?: (query: string, accountId: string) => void | Promise<void>
  onDelete?: (email: EmailMessage) => void
  onBulkDelete?: (emails: EmailMessage[]) => void | Promise<void>
  onBulkMarkRead?: (emails: EmailMessage[], isRead: boolean) => void | Promise<void>
  onBulkMove?: (emails: EmailMessage[], destinationFolderGraphId: string) => void | Promise<void>
}

export function EmailView({
  emails,
  emailAccounts,
  emailFolders,
  initialSearch,
  onClearInitialSearch,
  selectedId: controlledSelectedId,
  onSelectedIdChange,
  links,
  items,
  itemShares,
  onShareUpdate,
  onOpenActionFlow,
  onToggleStar,
  onToggleRead,
  onSetReadState,
  onCreateTask,
  onLinkExisting,
  onNavigateLink,
  onRemoveLink,
  onLoadFolderMessages,
  loadingFolderIds,
  usingRealIntegrations = false,
  onCompose,
  onReply,
  onReplyAll,
  onForward,
  onMoveMail,
  onServerSearch,
  onDelete,
  onBulkDelete,
  onBulkMarkRead,
  onBulkMove,
}: EmailViewProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(emails[0]?.id ?? null)
  const selectedId = controlledSelectedId ?? internalSelectedId
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const setSelectedId = (id: string | null) => {
    if (onSelectedIdChange) onSelectedIdChange(id)
    else setInternalSelectedId(id)
  }
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>({ mode: 'merged' })
  const isWide = useIsWide()

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch)
      onClearInitialSearch?.()
    }
  }, [initialSearch, onClearInitialSearch])

  const activeAccountId =
    inboxFilter.mode === 'account'
      ? inboxFilter.accountId
      : inboxFilter.mode === 'folder'
        ? emailFolders.find((folder) => folder.id === inboxFilter.folderId)?.accountId
        : null

  const accountFolders = useMemo(
    () =>
      activeAccountId
        ? emailFolders.filter((folder) => folder.accountId === activeAccountId)
        : [],
    [activeAccountId, emailFolders],
  )

  useEffect(() => {
    if (inboxFilter.mode !== 'folder') return
    const folder = emailFolders.find((entry) => entry.id === inboxFilter.folderId)
    if (folder) onLoadFolderMessages?.(folder)
  }, [emailFolders, inboxFilter, onLoadFolderMessages])

  useEffect(() => {
    if (!onServerSearch || !search.trim() || search.trim().length < 3) return
    const accountId =
      inboxFilter.mode === 'account'
        ? inboxFilter.accountId
        : emailAccounts.find((account) => account.id.startsWith('ms-'))?.id
    if (!accountId) return
    const timer = window.setTimeout(() => {
      void onServerSearch(search.trim(), accountId)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [search, onServerSearch, inboxFilter, emailAccounts])

  const filtered = useMemo(() => {
    let list = emails

    if (inboxFilter.mode === 'account') {
      list = list.filter((email) => email.accountId === inboxFilter.accountId)
    } else if (inboxFilter.mode === 'folder') {
      list = list.filter((email) => email.folderId === inboxFilter.folderId)
    }

    if (category !== 'All') {
      list = list.filter((e) => e.category === category)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.from.toLowerCase().includes(q) ||
          e.preview.toLowerCase().includes(q),
      )
    }
    return list
  }, [emails, inboxFilter, category, search])

  const selected = emails.find((e) => e.id === selectedId) ?? filtered[0] ?? null
  const unreadCount = emails.filter((e) => e.unread).length
  const selectedEmails = useMemo(
    () => filtered.filter((email) => selectedIds.has(email.id)),
    [filtered, selectedIds],
  )
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((email) => selectedIds.has(email.id))

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const toggleEmailSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filtered.map((email) => email.id)))
  }, [filtered])

  const setReadState = onSetReadState ?? ((id: string) => onToggleRead(id))

  const bulkMoveFolders = useMemo(() => {
    if (selectedEmails.length === 0) return []
    const accountId = selectedEmails[0]?.accountId
    if (!selectedEmails.every((email) => email.accountId === accountId)) return []
    return emailFolders.filter(
      (folder) =>
        folder.accountId === accountId &&
        folder.graphFolderId &&
        !selectedEmails.some((email) => email.folderId === folder.id),
    )
  }, [emailFolders, selectedEmails])

  const selectedShare = selected
    ? getShareForEntity(itemShares, 'email', selected.id)
    : undefined
  const selectedShareState = shareStateFromRecord(selectedShare)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-wf-border bg-wf-bg/90 px-4 pb-3 pt-2 backdrop-blur-xl safe-top">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="font-display text-title font-bold tracking-tight">Email</h1>
            <p className="text-subhead text-wf-text-secondary">
              {unreadCount} unread
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (selectionMode) exitSelectionMode()
                else setSelectionMode(true)
              }}
              className={`flex h-10 items-center gap-2 rounded-full px-4 text-subhead font-semibold transition-transform active:scale-95 ${
                selectionMode
                  ? 'bg-wf-surface text-wf-text shadow-[var(--shadow-card)]'
                  : 'bg-wf-surface text-wf-text-secondary shadow-[var(--shadow-card)]'
              }`}
            >
              {selectionMode ? <X size={16} strokeWidth={2} /> : <CheckSquare size={16} strokeWidth={2} />}
              {selectionMode ? 'Cancel' : 'Select'}
            </button>
            <button
              type="button"
              onClick={onCompose}
              disabled={!usingRealIntegrations || !onCompose || selectionMode}
              className="flex h-10 items-center gap-2 rounded-full bg-wf-accent px-4 text-subhead font-semibold text-white shadow-[var(--shadow-fab)] transition-transform active:scale-95 disabled:opacity-50"
            >
              <PenLine size={16} strokeWidth={2} />
              Compose
            </button>
          </div>
        </div>

        {selectionMode && selectedIds.size === 0 && (
          <p className="mb-3 rounded-xl bg-wf-accent-soft px-3 py-2 text-caption font-medium text-wf-accent">
            Tap messages to select them, or use Select all after choosing your first message.
          </p>
        )}
        {selectionMode && selectedIds.size > 0 && (
          <EmailBulkActionBar
            count={selectedIds.size}
            allSelected={allFilteredSelected}
            moveFolders={bulkMoveFolders}
            usingRealIntegrations={usingRealIntegrations}
            onSelectAll={selectAllFiltered}
            onClearSelection={() => setSelectedIds(new Set())}
            onMarkRead={() => {
              void onBulkMarkRead?.(selectedEmails, true)
              exitSelectionMode()
            }}
            onMarkUnread={() => {
              void onBulkMarkRead?.(selectedEmails, false)
              exitSelectionMode()
            }}
            onDelete={() => {
              void onBulkDelete?.(selectedEmails)
              exitSelectionMode()
            }}
            onMove={(folderGraphId) => {
              void onBulkMove?.(selectedEmails, folderGraphId)
              exitSelectionMode()
            }}
          />
        )}

        <div className="relative mb-3">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-wf-text-tertiary"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mail"
            className="w-full rounded-xl border border-wf-border bg-wf-surface py-2.5 pl-10 pr-4 text-body outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
          />
        </div>

        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip
            active={inboxFilter.mode === 'merged'}
            label="All accounts"
            onClick={() => setInboxFilter({ mode: 'merged' })}
          />
          {emailAccounts.map((account) => (
            <FilterChip
              key={account.id}
              active={
                inboxFilter.mode === 'account' && inboxFilter.accountId === account.id
              }
              label={account.label}
              colour={account.colour}
              onClick={() => setInboxFilter({ mode: 'account', accountId: account.id })}
            />
          ))}
        </div>

        {activeAccountId && accountFolders.length > 0 && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip
              active={inboxFilter.mode === 'account' && inboxFilter.accountId === activeAccountId}
              label="All folders"
              onClick={() => setInboxFilter({ mode: 'account', accountId: activeAccountId })}
            />
            {accountFolders.map((folder) => (
              <FilterChip
                key={folder.id}
                active={inboxFilter.mode === 'folder' && inboxFilter.folderId === folder.id}
                label={folder.label}
                onClick={() => setInboxFilter({ mode: 'folder', folderId: folder.id })}
              />
            ))}
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {EMAIL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`shrink-0 rounded-full px-3 py-1 text-caption font-semibold transition-colors ${
                category === cat
                  ? 'bg-wf-accent text-white'
                  : 'bg-wf-surface text-wf-text-secondary shadow-[var(--shadow-card)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className={`flex min-h-0 flex-1 ${isWide ? 'flex-row' : 'flex-col'}`}>
        <div
          className={`min-h-0 overflow-y-auto ${
            isWide ? 'w-[min(100%,380px)] min-w-[280px] shrink-0 border-r border-wf-border' : 'flex-1'
          }`}
        >
          {filtered.length === 0 ? (
            activeAccountId?.startsWith('apple-') ? (
              <div className="p-6 text-center">
                <p className="text-subhead text-wf-text-tertiary">
                  iCloud Mail cannot be synced in the browser yet.
                </p>
                <button
                  type="button"
                  onClick={() => openExternalUrl(icloudMailUrl())}
                  className="mt-4 rounded-xl bg-[#555555] px-4 py-2.5 text-subhead font-semibold text-white"
                >
                  Open iCloud Mail
                </button>
              </div>
            ) : (
              <p className="p-6 text-center text-subhead text-wf-text-tertiary">No messages</p>
            )
          ) : (
            filtered.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                emailAccounts={emailAccounts}
                emailFolders={emailFolders}
                selected={selected?.id === email.id}
                selectionMode={selectionMode}
                checked={selectedIds.has(email.id)}
                showAccountBadge={inboxFilter.mode === 'merged'}
                usingRealIntegrations={usingRealIntegrations}
                onSelect={() => {
                  if (selectionMode) {
                    toggleEmailSelection(email.id)
                    return
                  }
                  setSelectedId(email.id)
                  if (email.unread) onToggleRead(email.id)
                }}
                onToggleSelect={() => toggleEmailSelection(email.id)}
                onToggleStar={() => onToggleStar(email.id)}
                onReply={onReply}
                onReplyAll={onReplyAll}
                onForward={onForward}
                onDelete={onDelete}
                onSetReadState={setReadState}
                onCreateTask={onCreateTask}
                onLinkExisting={onLinkExisting}
                onMoveMail={onMoveMail}
              />
            ))
          )}
        </div>

        {(isWide || selected) && !selectionMode && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <MessagePreview
            email={selected}
            links={links}
            items={items}
            emails={emails}
            emailFolders={emailFolders}
            usingRealIntegrations={usingRealIntegrations}
            onClose={isWide ? undefined : () => setSelectedId(null)}
            onToggleStar={selected ? () => onToggleStar(selected.id) : undefined}
            onSetReadState={setReadState}
            onCreateTask={onCreateTask}
            onLinkExisting={onLinkExisting}
            onNavigateLink={onNavigateLink}
            onRemoveLink={onRemoveLink}
            shareState={selectedShareState}
            onShareUpdate={onShareUpdate}
            onOpenActionFlow={() => {
              if (selected) onOpenActionFlow(selected)
            }}
            onReply={onReply}
            onReplyAll={onReplyAll}
            onForward={onForward}
            onMoveMail={onMoveMail}
            onDelete={onDelete}
          />
          </div>
        )}
      </div>
    </div>
  )
}

function EmailBulkActionBar({
  count,
  allSelected,
  moveFolders,
  usingRealIntegrations,
  onSelectAll,
  onClearSelection,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onMove,
}: {
  count: number
  allSelected: boolean
  moveFolders: EmailFolder[]
  usingRealIntegrations: boolean
  onSelectAll: () => void
  onClearSelection: () => void
  onMarkRead: () => void
  onMarkUnread: () => void
  onDelete: () => void
  onMove: (folderGraphId: string) => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-wf-accent/20 bg-wf-accent-soft px-3 py-2">
      <span className="text-subhead font-semibold text-wf-accent">{count} selected</span>
      <button
        type="button"
        onClick={allSelected ? onClearSelection : onSelectAll}
        className="rounded-full bg-wf-surface px-3 py-1 text-caption font-semibold text-wf-text-secondary shadow-[var(--shadow-card)]"
      >
        {allSelected ? 'Deselect all' : 'Select all'}
      </button>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <BulkActionButton icon={MailOpen} label="Read" onClick={onMarkRead} />
        <BulkActionButton icon={Mail} label="Unread" onClick={onMarkUnread} />
        {usingRealIntegrations && moveFolders.length > 0 && (
          <label className="inline-flex items-center gap-1 rounded-full bg-wf-surface px-2 py-1 text-caption font-semibold text-wf-text-secondary shadow-[var(--shadow-card)]">
            <FolderInput size={12} strokeWidth={2} />
            <select
              defaultValue=""
              onChange={(event) => {
                const folder = moveFolders.find((entry) => entry.id === event.target.value)
                if (folder?.graphFolderId) {
                  onMove(folder.graphFolderId)
                  event.target.value = ''
                }
              }}
              className="max-w-[120px] bg-transparent text-caption font-semibold outline-none"
            >
              <option value="">Move…</option>
              {moveFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <BulkActionButton icon={Trash2} label="Delete" onClick={onDelete} variant="danger" />
      </div>
    </div>
  )
}

function BulkActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-caption font-semibold shadow-[var(--shadow-card)] transition-transform active:scale-95 ${
        variant === 'danger'
          ? 'bg-wf-surface text-wf-red'
          : 'bg-wf-surface text-wf-text-secondary'
      }`}
    >
      <Icon size={12} strokeWidth={2} />
      {label}
    </button>
  )
}

function deletedFolderForEmail(email: EmailMessage, folders: EmailFolder[]): EmailFolder | undefined {
  return folders.find(
    (folder) => folder.accountId === email.accountId && folder.wellKnown === 'deleteditems',
  )
}

function FilterChip({
  label,
  active,
  colour,
  onClick,
}: {
  label: string
  active: boolean
  colour?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold transition-colors ${
        active
          ? 'bg-wf-accent text-white'
          : 'bg-wf-surface text-wf-text-secondary shadow-[var(--shadow-card)]'
      }`}
    >
      {colour && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: colour }}
          aria-hidden
        />
      )}
      {label}
    </button>
  )
}

function EmailRow({
  email,
  emailAccounts,
  emailFolders,
  selected,
  selectionMode,
  checked,
  showAccountBadge,
  usingRealIntegrations,
  onSelect,
  onToggleSelect,
  onToggleStar,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onSetReadState,
  onCreateTask,
  onLinkExisting,
  onMoveMail,
}: {
  email: EmailMessage
  emailAccounts: EmailAccount[]
  emailFolders: EmailFolder[]
  selected: boolean
  selectionMode: boolean
  checked: boolean
  showAccountBadge?: boolean
  usingRealIntegrations?: boolean
  onSelect: () => void
  onToggleSelect: () => void
  onToggleStar: () => void
  onReply?: (email: EmailMessage) => void
  onReplyAll?: (email: EmailMessage) => void
  onForward?: (email: EmailMessage) => void
  onDelete?: (email: EmailMessage) => void
  onSetReadState?: (id: string, isRead: boolean) => void
  onCreateTask?: (email: EmailMessage) => void
  onLinkExisting?: (email: EmailMessage) => void
  onMoveMail?: (email: EmailMessage, destinationFolderGraphId: string) => void
}) {
  const account = showAccountBadge
    ? emailAccounts.find((entry) => entry.id === email.accountId)
    : undefined
  const canSyncRemote = usingRealIntegrations && Boolean(email.externalId)
  const archiveFolder = deletedFolderForEmail(email, emailFolders)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`group relative flex w-full min-w-0 cursor-pointer gap-2 border-b border-wf-border/50 px-3 text-left transition-colors sm:gap-3 sm:px-4 ${
        selectionMode ? 'py-3.5' : 'pb-9 pt-3.5'
      } ${selected || checked ? 'bg-wf-accent-soft' : 'hover:bg-black/[0.02]'}`}
    >
      {selectionMode ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggleSelect()
          }}
          className="mt-1 shrink-0 text-wf-accent"
          aria-label={checked ? 'Deselect message' : 'Select message'}
        >
          {checked ? <CheckSquare size={20} strokeWidth={2} /> : <Square size={20} strokeWidth={2} />}
        </button>
      ) : (
        <Avatar name={email.from} />
      )}

      <div className="min-w-0 flex-1 overflow-hidden pb-0.5 pr-1">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <span className={`min-w-0 truncate text-body ${email.unread ? 'font-bold text-wf-text' : 'font-medium text-wf-text-secondary'}`}>
            {email.from}
          </span>
          <span className="shrink-0 tabular-nums text-caption text-wf-text-tertiary">
            {formatEmailDate(email.date)}
          </span>
        </div>
        <p className={`flex min-w-0 items-center gap-1 truncate text-subhead ${email.unread ? 'font-semibold text-wf-text' : 'text-wf-text'}`}>
          {email.flagged && <Flag size={12} className="shrink-0 fill-wf-orange text-wf-orange" />}
          <span className="truncate">{email.subject}</span>
        </p>
        <p className="truncate text-caption text-wf-text-tertiary">{email.preview}</p>
      </div>

      {!selectionMode && (
        <>
          <div className="pointer-events-none absolute bottom-2 left-14 right-10 z-10 flex items-center justify-between gap-2">
            {showAccountBadge && account ? (
              <span
                className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-wf-text-secondary"
                title={account.email}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: account.colour }}
                  aria-hidden
                />
                {account.label}
              </span>
            ) : (
              <span aria-hidden />
            )}
            <div
              className={`pointer-events-none transition-opacity ${
                selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
              }`}
            >
              <div
                className={`pointer-events-auto flex items-center gap-0.5 rounded-lg py-1 pl-2 pr-1 shadow-[var(--shadow-card)] ${
                  selected ? 'bg-wf-accent-soft/95' : 'bg-wf-surface/95'
                }`}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <EmailRowQuickActions
                  email={email}
                  canSyncRemote={canSyncRemote}
                  archiveFolder={archiveFolder}
                  onReply={onReply}
                  onForward={onForward}
                  onDelete={onDelete}
                  onSetReadState={onSetReadState}
                  onMoveMail={onMoveMail}
                />
              </div>
            </div>
          </div>
          <div className="flex w-8 shrink-0 flex-col items-center gap-1 self-start pt-0.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onToggleStar()
              }}
              className="text-wf-text-tertiary transition-colors hover:text-wf-orange"
              aria-label={email.starred ? 'Unstar' : 'Star'}
            >
              <Star
                size={18}
                strokeWidth={1.75}
                className={email.starred ? 'fill-wf-orange text-wf-orange' : ''}
              />
            </button>
            {email.unread && (
              <span className="h-2 w-2 rounded-full bg-wf-accent" aria-hidden />
            )}
          </div>
        </>
      )}
    </div>
  )
}

function EmailRowQuickActions({
  email,
  canSyncRemote,
  archiveFolder,
  onReply,
  onForward,
  onDelete,
  onSetReadState,
  onMoveMail,
}: {
  email: EmailMessage
  canSyncRemote: boolean
  archiveFolder?: EmailFolder
  onReply?: (email: EmailMessage) => void
  onForward?: (email: EmailMessage) => void
  onDelete?: (email: EmailMessage) => void
  onSetReadState?: (id: string, isRead: boolean) => void
  onMoveMail?: (email: EmailMessage, destinationFolderGraphId: string) => void
}) {
  return (
    <>
      {onReply && (
        <IconButton icon={Reply} label="Reply" size="sm" variant="ghost" onClick={() => onReply(email)} />
      )}
      {onForward && (
        <IconButton icon={Share2} label="Forward" size="sm" variant="ghost" onClick={() => onForward(email)} />
      )}
      {onDelete && (
        <IconButton icon={Trash2} label="Delete" size="sm" variant="ghost" onClick={() => onDelete(email)} />
      )}
      {onSetReadState && (
        <IconButton
          icon={email.unread ? MailOpen : Mail}
          label={email.unread ? 'Mark read' : 'Mark unread'}
          size="sm"
          variant="ghost"
          onClick={() => onSetReadState(email.id, email.unread)}
        />
      )}
      {canSyncRemote && archiveFolder?.graphFolderId && onMoveMail && (
        <IconButton
          icon={Archive}
          label="Archive"
          size="sm"
          variant="ghost"
          onClick={() => onMoveMail(email, archiveFolder.graphFolderId!)}
        />
      )}
    </>
  )
}

function EmailMessageToolbar({
  email,
  usingRealIntegrations,
  moveFolders,
  archiveFolder,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onSetReadState,
  onCreateTask,
  onLinkExisting,
  onMoveMail,
  onToggleStar,
  compact = false,
  className = '',
}: {
  email: EmailMessage
  usingRealIntegrations: boolean
  moveFolders: EmailFolder[]
  archiveFolder?: EmailFolder
  onReply?: (email: EmailMessage) => void
  onReplyAll?: (email: EmailMessage) => void
  onForward?: (email: EmailMessage) => void
  onDelete?: (email: EmailMessage) => void
  onSetReadState?: (id: string, isRead: boolean) => void
  onCreateTask: (email: EmailMessage) => void
  onLinkExisting: (email: EmailMessage) => void
  onMoveMail?: (email: EmailMessage, destinationFolderGraphId: string) => void
  onToggleStar?: () => void
  compact?: boolean
  className?: string
}) {
  const canSyncRemote = usingRealIntegrations && Boolean(email.externalId)

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`}>
        {onReply && (
          <ActionChip icon={Reply} label="Reply" onClick={() => onReply(email)} />
        )}
        {onReplyAll && (
          <ActionChip icon={ReplyAll} label="Reply all" onClick={() => onReplyAll(email)} />
        )}
        {onForward && (
          <ActionChip icon={Share2} label="Forward" onClick={() => onForward(email)} />
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {onReply && (
          <ActionChip icon={Reply} label="Reply" onClick={() => onReply(email)} />
        )}
        {onReplyAll && (
          <ActionChip icon={ReplyAll} label="Reply all" onClick={() => onReplyAll(email)} />
        )}
        {onForward && (
          <ActionChip icon={Share2} label="Forward" onClick={() => onForward(email)} />
        )}
        {onDelete && (
          <ActionChip icon={Trash2} label="Delete" onClick={() => onDelete(email)} />
        )}
        {onSetReadState && (
          <ActionChip
            icon={email.unread ? MailOpen : Mail}
            label={email.unread ? 'Mark read' : 'Mark unread'}
            onClick={() => onSetReadState(email.id, email.unread)}
          />
        )}
        {canSyncRemote && archiveFolder?.graphFolderId && onMoveMail && (
          <ActionChip
            icon={Archive}
            label="Archive"
            onClick={() => onMoveMail(email, archiveFolder.graphFolderId!)}
          />
        )}
        {onToggleStar && (
          <ActionChip icon={Star} label={email.starred ? 'Unstar' : 'Star'} onClick={onToggleStar} />
        )}
        <ActionChip icon={ClipboardList} label="Task" onClick={() => onCreateTask(email)} />
        <ActionChip icon={Link2} label="Link" onClick={() => onLinkExisting(email)} />
      </div>
      {canSyncRemote && onMoveMail && moveFolders.length > 0 && (
        <label className="flex items-center gap-2">
          <FolderInput size={16} className="shrink-0 text-wf-text-tertiary" strokeWidth={1.75} />
          <select
            defaultValue=""
            onChange={(event) => {
              const folder = moveFolders.find((entry) => entry.id === event.target.value)
              if (folder?.graphFolderId) {
                onMoveMail(email, folder.graphFolderId)
                event.target.value = ''
              }
            }}
            className="min-w-0 flex-1 rounded-xl border border-wf-border bg-wf-bg px-3 py-2 text-caption font-semibold text-wf-text-secondary"
          >
            <option value="">Move to folder…</option>
            {moveFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-caption font-bold text-white"
      style={{ background: `linear-gradient(135deg, hsl(${hue}, 45%, 45%), hsl(${hue}, 55%, 55%))` }}
    >
      {initials}
    </div>
  )
}

function MessagePreview({
  email,
  links,
  items,
  emails,
  usingRealIntegrations = false,
  onClose,
  onToggleStar,
  onSetReadState,
  onCreateTask,
  onLinkExisting,
  onNavigateLink,
  onRemoveLink,
  shareState,
  onShareUpdate,
  onOpenActionFlow,
  onReply,
  onReplyAll,
  onForward,
  onMoveMail,
  emailFolders,
  onDelete,
}: {
  email: EmailMessage | null
  links: ItemLink[]
  items: CalendarItem[]
  emails: EmailMessage[]
  usingRealIntegrations?: boolean
  onClose?: () => void
  onToggleStar?: () => void
  onSetReadState?: (id: string, isRead: boolean) => void
  onCreateTask: (email: EmailMessage) => void
  onLinkExisting: (email: EmailMessage) => void
  onNavigateLink: (type: EntityType, id: string) => void
  onRemoveLink?: (linkId: string) => void
  shareState: { sharedToBoard: boolean; boardDisplay: BoardDisplay }
  onShareUpdate: (input: UpsertItemShareInput) => void
  onOpenActionFlow: () => void
  onReply?: (email: EmailMessage) => void
  onReplyAll?: (email: EmailMessage) => void
  onForward?: (email: EmailMessage) => void
  onMoveMail?: (email: EmailMessage, destinationFolderGraphId: string) => void
  emailFolders: EmailFolder[]
  onDelete?: (email: EmailMessage) => void
}) {
  const [attachments, setAttachments] = useState<EmailAttachment[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)

  useEffect(() => {
    if (!email?.externalId || !email.connectedAccountId || email.provider !== 'microsoft') {
      setAttachments([])
      return
    }

    let cancelled = false
    setAttachmentsLoading(true)
    void fetchMicrosoftMessageAttachments(email.connectedAccountId, email.externalId)
      .then((items) => {
        if (!cancelled) setAttachments(items)
      })
      .catch(() => {
        if (!cancelled) setAttachments([])
      })
      .finally(() => {
        if (!cancelled) setAttachmentsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [email?.id, email?.externalId, email?.connectedAccountId, email?.provider])

  const fileAttachments = useMemo(
    () => attachments.filter((attachment) => !attachment.isInline),
    [attachments],
  )

  const htmlBody = useMemo(() => {
    if (!email || !isHtmlEmailBody(email.body, email.bodyContentType)) return null
    if (email.provider !== 'microsoft' || !email.externalId || !email.connectedAccountId) {
      return email.body
    }
    return enrichEmailHtmlWithInlineAttachments(email.body, attachments, (attachmentId) =>
      microsoftAttachmentDownloadUrl(
        email.connectedAccountId!,
        email.externalId!,
        attachmentId,
        { inline: true },
      ),
    )
  }, [attachments, email])

  const plainBody = useMemo(() => {
    if (!email) return ''
    if (htmlBody) return ''
    return normalizeEmailBody(email.body, email.bodyContentType) || email.preview || ''
  }, [email, htmlBody])

  const moveFolders = email
    ? emailFolders.filter(
        (folder) =>
          folder.accountId === email.accountId &&
          folder.graphFolderId &&
          folder.id !== email.folderId,
      )
    : []

  const archiveFolder = email ? deletedFolderForEmail(email, emailFolders) : undefined

  if (!email) {
    return (
      <div className="hidden flex-1 items-center justify-center text-subhead text-wf-text-tertiary md:flex">
        Select a message
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-wf-surface">
      <div className="shrink-0 border-b border-wf-border px-4 py-3">
        {onClose ? (
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 text-body font-medium text-wf-accent"
            >
              <ChevronLeft size={20} strokeWidth={2} />
              Inbox
            </button>
          </div>
        ) : null}
        <h2 className="font-display text-body font-bold leading-snug">{email.subject}</h2>
        <div className="mt-2">
          <LinkChips
            entityType="email"
            entityId={email.id}
            links={links}
            items={items}
            emails={emails}
            onNavigate={onNavigateLink}
            onRemove={onRemoveLink}
            compact
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Avatar name={email.from} />
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold">{email.from}</p>
            <p className="truncate text-caption text-wf-text-tertiary">{email.fromEmail}</p>
          </div>
          <button
            type="button"
            onClick={onToggleStar}
            className="shrink-0 text-wf-text-tertiary"
            aria-label={email.starred ? 'Unstar' : 'Star'}
          >
            <Star
              size={22}
              strokeWidth={1.75}
              className={email.starred ? 'fill-wf-orange text-wf-orange' : ''}
            />
          </button>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4">
        <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-wf-border bg-wf-surface px-4 pb-3 pt-1">
          <EmailMessageToolbar
            email={email}
            usingRealIntegrations={usingRealIntegrations}
            moveFolders={moveFolders}
            archiveFolder={archiveFolder}
            onReply={onReply}
            onReplyAll={onReplyAll}
            onForward={onForward}
            onDelete={onDelete}
            onSetReadState={onSetReadState}
            onCreateTask={onCreateTask}
            onLinkExisting={onLinkExisting}
            onMoveMail={onMoveMail}
            onToggleStar={onToggleStar}
          />
        </div>
        {attachmentsLoading && fileAttachments.length === 0 && email.hasAttachments && (
          <p className="mb-4 text-caption text-wf-text-tertiary">Loading attachments…</p>
        )}
        {fileAttachments.length > 0 && (
          <div className="mb-4 rounded-xl border border-wf-border bg-wf-bg p-3">
            <p className="mb-2 text-caption font-semibold text-wf-text-secondary">Attachments</p>
            <ul className="space-y-2">
              {fileAttachments.map((attachment) => (
                <li key={attachment.id}>
                  <a
                    href={
                      email.externalId && email.connectedAccountId
                        ? microsoftAttachmentDownloadUrl(
                            email.connectedAccountId,
                            email.externalId,
                            attachment.id,
                          )
                        : '#'
                    }
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-subhead text-wf-accent hover:bg-wf-surface"
                  >
                    <span className="truncate">{attachment.name}</span>
                    {attachment.size != null && (
                      <span className="shrink-0 text-caption text-wf-text-tertiary">
                        {Math.round(attachment.size / 1024)} KB
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {htmlBody ? (
          <EmailHtmlBody html={htmlBody} />
        ) : (
          <p className="whitespace-pre-wrap break-words text-body leading-relaxed text-wf-text">
            {plainBody || '(No message body)'}
          </p>
        )}
        <EmailMessageToolbar
          email={email}
          usingRealIntegrations={usingRealIntegrations}
          moveFolders={moveFolders}
          archiveFolder={archiveFolder}
          onReply={onReply}
          onReplyAll={onReplyAll}
          onForward={onForward}
          compact
          className="mt-6 border-t border-wf-border pt-4"
        />
      </div>

      <div className="shrink-0 border-t border-wf-border bg-wf-bg px-4 py-3">
        <ShareToBoardFields
          compact
          sharedToBoard={shareState.sharedToBoard}
          boardDisplay={shareState.boardDisplay}
          onSharedChange={(sharedToBoard) =>
            onShareUpdate({
              itemType: 'email',
              itemId: email.id,
              sharedToBoard,
              boardDisplay: shareState.boardDisplay,
            })
          }
          onDisplayChange={(boardDisplay) =>
            onShareUpdate({
              itemType: 'email',
              itemId: email.id,
              sharedToBoard: shareState.sharedToBoard,
              boardDisplay,
            })
          }
        />
        <button
          type="button"
          onClick={onOpenActionFlow}
          className="mt-3 w-full rounded-xl bg-wf-accent py-2.5 text-subhead font-semibold text-white shadow-[var(--shadow-fab)] transition-transform active:scale-[0.98]"
        >
          Action flow — calendar + task + folder
        </button>
      </div>
    </div>
  )
}

function ActionChip({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  if (disabled || !onClick) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-wf-bg px-2.5 py-1 text-caption font-semibold text-wf-text-tertiary opacity-60">
        <Icon size={12} strokeWidth={2} />
        {label}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full bg-wf-accent-soft px-2.5 py-1 text-caption font-semibold text-wf-accent transition-transform active:scale-95"
    >
      <Icon size={12} strokeWidth={2} />
      {label}
    </button>
  )
}

function formatEmailDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
