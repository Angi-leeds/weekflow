import { useEffect, useRef, useState } from 'react'
import { Check, ListFilter } from 'lucide-react'
import type { Category, ListDisplayOptions, ListGroupBy, ListSortBy } from '../../types'
import {
  DEFAULT_LIST_OPTIONS,
  LIST_GROUP_LABELS,
  LIST_SORT_LABELS,
} from '../../types'

interface ListOptionsMenuProps {
  categories: Category[]
  options: ListDisplayOptions
  onChange: (options: ListDisplayOptions) => void
}

const GROUP_OPTIONS: ListGroupBy[] = ['none', 'category', 'time', 'kind']
const SORT_OPTIONS: ListSortBy[] = ['time', 'alpha']

export function ListOptionsMenu({ categories, options, onChange }: ListOptionsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isActive =
    options.groupBy !== 'none' ||
    options.hideCompleted ||
    (options.categoryFilter && options.categoryFilter.length > 0)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const allIds = categories.map((c) => c.id)

  const toggleCategory = (id: string) => {
    const current = options.categoryFilter ?? [...allIds]
    const has = current.includes(id)
    let next: string[] | null
    if (has) {
      next = current.filter((t) => t !== id)
      if (next.length === 0 || next.length === allIds.length) next = null
    } else {
      next = [...current, id]
      if (next.length === allIds.length) next = null
    }
    onChange({ ...options, categoryFilter: next })
  }

  const isCategoryActive = (id: string) =>
    !options.categoryFilter || options.categoryFilter.includes(id)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-subhead font-semibold transition-all active:scale-95 ${
          isActive
            ? 'bg-wf-accent text-white shadow-[var(--shadow-card)]'
            : 'bg-wf-surface text-wf-text-secondary shadow-[var(--shadow-card)] hover:text-wf-text'
        }`}
        aria-expanded={open}
      >
        <ListFilter size={16} strokeWidth={1.75} />
        List
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 max-h-[70vh] w-[280px] animate-scale-in overflow-y-auto rounded-2xl bg-wf-surface py-2 shadow-[var(--shadow-modal)]">
          <MenuSection title="Group by">
            {GROUP_OPTIONS.map((key) => (
              <MenuOption
                key={key}
                label={LIST_GROUP_LABELS[key]}
                active={options.groupBy === key}
                onClick={() => onChange({ ...options, groupBy: key })}
              />
            ))}
          </MenuSection>

          <MenuDivider />

          <MenuSection title="Sort within groups">
            {SORT_OPTIONS.map((key) => (
              <MenuOption
                key={key}
                label={LIST_SORT_LABELS[key]}
                active={options.sortBy === key}
                onClick={() => onChange({ ...options, sortBy: key })}
              />
            ))}
          </MenuSection>

          <MenuDivider />

          <MenuSection title="Show categories">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-black/[0.03]"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.colour }}
                />
                <span className="flex-1 text-body text-wf-text">{cat.name}</span>
                {isCategoryActive(cat.id) && (
                  <Check size={16} className="shrink-0 text-wf-accent" strokeWidth={2.5} />
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onChange({ ...options, categoryFilter: null })}
              className="mx-4 mt-1 block text-caption font-medium text-wf-accent"
            >
              Show all categories
            </button>
          </MenuSection>

          <MenuDivider />

          <label className="flex cursor-pointer items-center justify-between px-4 py-2.5 hover:bg-black/[0.03]">
            <span className="text-body text-wf-text">Hide completed</span>
            <input
              type="checkbox"
              checked={options.hideCompleted}
              onChange={(e) => onChange({ ...options, hideCompleted: e.target.checked })}
              className="h-5 w-5 rounded accent-wf-accent"
            />
          </label>

          <MenuDivider />

          <button
            type="button"
            onClick={() => onChange(DEFAULT_LIST_OPTIONS)}
            className="w-full px-4 py-2 text-left text-caption font-medium text-wf-text-secondary hover:text-wf-accent"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  )
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 py-1 text-caption font-semibold text-wf-text-tertiary">{title}</p>
      {children}
    </div>
  )
}

function MenuOption({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-black/[0.03] ${
        active ? 'bg-wf-accent-soft' : ''
      }`}
    >
      <span className={`flex-1 text-body ${active ? 'font-medium text-wf-accent' : 'text-wf-text'}`}>
        {label}
      </span>
      {active && <Check size={16} className="shrink-0 text-wf-accent" strokeWidth={2.5} />}
    </button>
  )
}

function MenuDivider() {
  return <div className="my-1 border-t border-wf-border" />
}
