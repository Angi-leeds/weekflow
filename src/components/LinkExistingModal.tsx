import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { EntityType, ItemLink } from '../../shared/links'
import type { CalendarItem, Category, EmailMessage } from '../types'
import { isInSameLinkCluster } from '../lib/links'
import {
  getItemLinkType,
  linkTargetIcon,
} from '../lib/itemLinkHelpers'

type PickerTab = 'all' | 'tasks' | 'events'

interface LinkExistingModalProps {
  open: boolean
  sourceType: EntityType
  sourceId: string
  sourceLabel: string
  items: CalendarItem[]
  categories: Category[]
  emails: EmailMessage[]
  links: ItemLink[]
  onClose: () => void
  onSelect: (targetType: EntityType, targetId: string) => void
}

export function LinkExistingModal({
  open,
  sourceType,
  sourceId,
  sourceLabel,
  items,
  categories,
  emails: _emails,
  links,
  onClose,
  onSelect,
}: LinkExistingModalProps) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<PickerTab>('all')

  const candidates = useMemo(() => {
    let list = items.filter((item) => item.id !== sourceId)

    if (tab === 'tasks') {
      list = list.filter((item) => getItemLinkType(item, categories) === 'task')
    } else if (tab === 'events') {
      list = list.filter((item) => getItemLinkType(item, categories) === 'calendar')
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.notes?.toLowerCase().includes(q) ?? false),
      )
    }

    return list.filter((item) => {
      const targetType = getItemLinkType(item, categories)
      return !isInSameLinkCluster(links, sourceType, sourceId, targetType, item.id)
    })
  }, [items, categories, tab, search, links, sourceType, sourceId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 animate-fade-in backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col animate-slide-up rounded-t-3xl bg-wf-surface shadow-[var(--shadow-modal)] safe-bottom sm:mx-4 sm:rounded-3xl">
        <div className="shrink-0 border-b border-wf-border px-5 pb-4 pt-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[20px] font-bold">Link existing</h2>
              <p className="truncate text-caption text-wf-text-secondary">
                From: {sourceLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-wf-text-secondary hover:bg-wf-bg"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2} />
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
              placeholder="Search items"
              className="w-full rounded-xl border border-wf-border bg-wf-bg py-2.5 pl-10 pr-4 text-body outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
              autoFocus
            />
          </div>

          <div className="flex gap-1.5">
            {(['all', 'tasks', 'events'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-full px-3 py-1 text-caption font-semibold capitalize transition-colors ${
                  tab === value
                    ? 'bg-wf-accent text-white'
                    : 'bg-wf-bg text-wf-text-secondary'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {candidates.length === 0 ? (
            <p className="p-6 text-center text-subhead text-wf-text-tertiary">
              No items to link
            </p>
          ) : (
            candidates.map((item) => {
              const targetType = getItemLinkType(item, categories)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(targetType, item.id)
                    onClose()
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-wf-bg"
                >
                  <span className="text-lg" aria-hidden>
                    {linkTargetIcon(targetType)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium">{item.title}</p>
                    <p className="text-caption text-wf-text-tertiary">
                      {new Date(item.date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.colour }}
                  />
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
