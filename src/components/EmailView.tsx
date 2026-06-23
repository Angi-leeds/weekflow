import { useMemo, useState } from 'react'
import {
  CalendarPlus,
  ChevronLeft,
  ClipboardList,
  Clock,
  Flag,
  Link2,
  PenLine,
  Search,
  Star,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EmailMessage } from '../types'
import { useIsWide } from '../hooks/useMediaQuery'
import { EMAIL_CATEGORIES } from '../mockData'
import { Badge } from './ui/Badge'

interface EmailViewProps {
  emails: EmailMessage[]
  onToggleStar: (id: string) => void
  onToggleRead: (id: string) => void
}

export function EmailView({ emails, onToggleStar, onToggleRead }: EmailViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(emails[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const isWide = useIsWide()

  const filtered = useMemo(() => {
    let list = emails
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
  }, [emails, category, search])

  const selected = emails.find((e) => e.id === selectedId) ?? filtered[0] ?? null
  const unreadCount = emails.filter((e) => e.unread).length

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
            className="flex h-10 items-center gap-2 rounded-full bg-wf-accent px-4 text-subhead font-semibold text-white shadow-[var(--shadow-fab)] transition-transform active:scale-95"
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
                selected={selected?.id === email.id}
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
            onClose={isWide ? undefined : () => setSelectedId(null)}
            onToggleStar={selected ? () => onToggleStar(selected.id) : undefined}
          />
        )}
      </div>
    </div>
  )
}

function EmailRow({
  email,
  selected,
  onSelect,
  onToggleStar,
}: {
  email: EmailMessage
  selected: boolean
  onSelect: () => void
  onToggleStar: () => void
}) {
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
        {email.labels.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
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
  onClose,
  onToggleStar,
}: {
  email: EmailMessage | null
  onClose?: () => void
  onToggleStar?: () => void
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
            <ActionChip icon={ClipboardList} label="Task" />
            <ActionChip icon={CalendarPlus} label="Event" />
            <ActionChip icon={Clock} label="Snooze" />
          </div>
        </div>
        <h2 className="font-display text-body font-bold leading-snug">{email.subject}</h2>
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
          {email.body}
        </p>
      </div>

      <div className="shrink-0 border-t border-wf-border bg-wf-bg px-4 py-3">
        <p className="mb-2 text-caption font-semibold text-wf-text-secondary">
          Email actions — coming soon
        </p>
        <div className="flex flex-wrap gap-2">
          <FutureAction icon={ClipboardList} label="Convert to task" />
          <FutureAction icon={CalendarPlus} label="Add to calendar" />
          <FutureAction icon={Clock} label="Snooze until date" />
          <FutureAction icon={Link2} label="Link to appointment" />
        </div>
        <p className="mt-3 text-caption text-wf-text-tertiary">
          Future integrations: Gmail · Outlook · Apple Mail
        </p>
      </div>
    </div>
  )
}

function ActionChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-wf-accent-soft px-2.5 py-1 text-caption font-semibold text-wf-accent">
      <Icon size={12} strokeWidth={2} />
      {label}
    </span>
  )
}

function FutureAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-xl bg-wf-surface px-3 py-2 text-subhead font-medium text-wf-text-secondary shadow-[var(--shadow-card)] opacity-60"
      disabled
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
