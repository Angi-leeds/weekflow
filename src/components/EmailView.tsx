import { useEffect, useMemo, useState } from 'react'
import {
  CalendarPlus,
  ChevronLeft,
  ClipboardList,
  Clock,
  Flag,
  Link2,
  PenLine,
  Reply,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EntityType, ItemLink } from '../../shared/links'
import { normalizeEmailBody } from '../../shared/emailBody'
import type { BoardDisplay, ItemShare, UpsertItemShareInput } from '../../shared/itemShares'
import type { CalendarItem, EmailMessage } from '../types'
import { useIsWide } from '../hooks/useMediaQuery'
import {
  EMAIL_CATEGORIES,
} from '../mockData'
import type { EmailAccount, EmailFolder } from '../types'
import { getShareForEntity } from '../lib/itemShares'
import { Badge } from './ui/Badge'
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
  onCreateTask: (email: EmailMessage) => void
  onLinkExisting: (email: EmailMessage) => void
  onNavigateLink: (type: EntityType, id: string) => void
  onRemoveLink?: (linkId: string) => void
  onLoadFolderMessages?: (folder: EmailFolder) => void
  loadingFolderIds?: Set<string>
  usingRealMicrosoft?: boolean
  onCompose?: () => void
  onReply?: (email: EmailMessage) => void
  onReplyAll?: (email: EmailMessage) => void
  onDelete?: (email: EmailMessage) => void
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
  onCreateTask,
  onLinkExisting,
  onNavigateLink,
  onRemoveLink,
  onLoadFolderMessages,
  loadingFolderIds,
  usingRealMicrosoft = false,
  onCompose,
  onReply,
  onReplyAll,
  onDelete,
}: EmailViewProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(emails[0]?.id ?? null)
  const selectedId = controlledSelectedId ?? internalSelectedId

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
          <button
            type="button"
            onClick={onCompose}
            disabled={!usingRealMicrosoft || !onCompose}
            className="flex h-10 items-center gap-2 rounded-full bg-wf-accent px-4 text-subhead font-semibold text-white shadow-[var(--shadow-fab)] transition-transform active:scale-95 disabled:opacity-50"
          >
            <PenLine size={16} strokeWidth={2} />
            Compose
          </button>
        </div>

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
            isWide ? 'w-[340px] shrink-0 border-r border-wf-border' : 'flex-1'
          }`}
        >
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-subhead text-wf-text-tertiary">No messages</p>
          ) : (
            filtered.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                emailAccounts={emailAccounts}
                selected={selected?.id === email.id}
                showAccountBadge={inboxFilter.mode === 'merged'}
                onSelect={() => {
                  setSelectedId(email.id)
                  if (email.unread) onToggleRead(email.id)
                }}
                onToggleStar={() => onToggleStar(email.id)}
              />
            ))
          )}
        </div>

        {(isWide || selected) && (
          <MessagePreview
            email={selected}
            links={links}
            items={items}
            emails={emails}
            usingRealMicrosoft={usingRealMicrosoft}
            onClose={isWide ? undefined : () => setSelectedId(null)}
            onToggleStar={selected ? () => onToggleStar(selected.id) : undefined}
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
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
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
  selected,
  showAccountBadge,
  onSelect,
  onToggleStar,
}: {
  email: EmailMessage
  emailAccounts: EmailAccount[]
  selected: boolean
  showAccountBadge?: boolean
  onSelect: () => void
  onToggleStar: () => void
}) {
  const account = showAccountBadge
    ? emailAccounts.find((entry) => entry.id === email.accountId)
    : undefined

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
      className={`flex w-full cursor-pointer gap-3 border-b border-wf-border/50 px-4 py-3.5 text-left transition-colors ${
        selected ? 'bg-wf-accent-soft' : 'hover:bg-black/[0.02]'
      }`}
    >
      <Avatar name={email.from} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-body ${email.unread ? 'font-bold text-wf-text' : 'font-medium text-wf-text-secondary'}`}>
            {email.from}
          </span>
          <span className="shrink-0 tabular-nums text-caption text-wf-text-tertiary">
            {formatEmailDate(email.date)}
          </span>
        </div>
        <p className={`flex items-center gap-1 truncate text-subhead ${email.unread ? 'font-semibold text-wf-text' : 'text-wf-text'}`}>
          {email.flagged && <Flag size={12} className="shrink-0 fill-wf-orange text-wf-orange" />}
          {email.subject}
        </p>
        <p className="truncate text-caption text-wf-text-tertiary">{email.preview}</p>
        {(account || email.labels.length > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {account && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: account.colour }}
              >
                {account.label}
              </span>
            )}
            {email.labels.map((label) => (
              <Badge key={label} label={label} />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onToggleStar()
        }}
        className="mt-1 shrink-0 text-wf-text-tertiary transition-colors hover:text-wf-orange"
        aria-label={email.starred ? 'Unstar' : 'Star'}
      >
        <Star
          size={18}
          strokeWidth={1.75}
          className={email.starred ? 'fill-wf-orange text-wf-orange' : ''}
        />
      </button>

      {email.unread && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-wf-accent" />
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
  usingRealMicrosoft = false,
  onClose,
  onToggleStar,
  onCreateTask,
  onLinkExisting,
  onNavigateLink,
  onRemoveLink,
  shareState,
  onShareUpdate,
  onOpenActionFlow,
  onReply,
  onReplyAll,
  onDelete,
}: {
  email: EmailMessage | null
  links: ItemLink[]
  items: CalendarItem[]
  emails: EmailMessage[]
  usingRealMicrosoft?: boolean
  onClose?: () => void
  onToggleStar?: () => void
  onCreateTask: (email: EmailMessage) => void
  onLinkExisting: (email: EmailMessage) => void
  onNavigateLink: (type: EntityType, id: string) => void
  onRemoveLink?: (linkId: string) => void
  shareState: { sharedToBoard: boolean; boardDisplay: BoardDisplay }
  onShareUpdate: (input: UpsertItemShareInput) => void
  onOpenActionFlow: () => void
  onReply?: (email: EmailMessage) => void
  onReplyAll?: (email: EmailMessage) => void
  onDelete?: (email: EmailMessage) => void
}) {
  if (!email) {
    return (
      <div className="hidden flex-1 items-center justify-center text-subhead text-wf-text-tertiary md:flex">
        Select a message
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-wf-surface">
      <div className="shrink-0 border-b border-wf-border px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 text-body font-medium text-wf-accent"
            >
              <ChevronLeft size={20} strokeWidth={2} />
              Inbox
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-1.5">
            {usingRealMicrosoft && email.externalId && (
              <>
                <ActionChip icon={Reply} label="Reply" onClick={() => onReply?.(email)} />
                <ActionChip icon={Reply} label="Reply all" onClick={() => onReplyAll?.(email)} />
              </>
            )}
            <ActionChip
              icon={ClipboardList}
              label="Task"
              onClick={() => onCreateTask(email)}
            />
            <ActionChip icon={CalendarPlus} label="Event" disabled />
            <ActionChip icon={Clock} label="Snooze" disabled />
          </div>
        </div>
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <p className="whitespace-pre-wrap text-body leading-relaxed text-wf-text">
          {normalizeEmailBody(email.body) || email.preview || '(No message body)'}
        </p>
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

        <p className="mb-2 mt-4 text-caption font-semibold text-wf-text-secondary">
          Email actions
        </p>
        {usingRealMicrosoft && email.externalId && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(email)}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-wf-red/30 py-2.5 text-subhead font-semibold text-wf-red"
          >
            <Trash2 size={16} strokeWidth={1.75} />
            Delete message
          </button>
        )}
        <button
          type="button"
          onClick={onOpenActionFlow}
          className="mb-3 w-full rounded-xl bg-wf-accent py-3 text-subhead font-semibold text-white shadow-[var(--shadow-fab)] transition-transform active:scale-[0.98]"
        >
          Action flow — calendar + task + folder
        </button>
        <div className="flex flex-wrap gap-2">
          <EmailAction
            icon={ClipboardList}
            label="Convert to task"
            onClick={() => onCreateTask(email)}
          />
          <EmailAction icon={CalendarPlus} label="Add to calendar" disabled />
          <EmailAction icon={Clock} label="Snooze until date" disabled />
          <EmailAction
            icon={Link2}
            label="Link to appointment"
            onClick={() => onLinkExisting(email)}
          />
        </div>
        <p className="mt-3 text-caption text-wf-text-tertiary">
          {usingRealMicrosoft
            ? 'Sent via connected Outlook account.'
            : 'Future integrations: Gmail · Outlook · Apple Mail'}
        </p>
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

function EmailAction({
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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-xl bg-wf-surface px-3 py-2 text-subhead font-medium text-wf-text-secondary shadow-[var(--shadow-card)] transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      <Icon size={16} strokeWidth={1.75} />
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
