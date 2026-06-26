import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Category } from '../types'
import { resolveItemColour } from '../categories'

interface CategoryPickerProps {
  categories: Category[]
  categoryId: string
  outlookCategories?: string[]
  multiSelect?: boolean
  onChange: (update: {
    categoryId: string
    outlookCategories?: string[]
    colour: string
  }) => void
}

function primaryFromOutlookSelection(
  categories: Category[],
  selectedNames: string[],
  fallbackCategoryId: string,
): { categoryId: string; colour: string } {
  const primary = categories.find((cat) => selectedNames.includes(cat.name))
  return {
    categoryId: primary?.id ?? fallbackCategoryId,
    colour: primary?.colour ?? resolveItemColour(categories, fallbackCategoryId),
  }
}

export function CategoryPicker({
  categories,
  categoryId,
  outlookCategories = [],
  multiSelect = false,
  onChange,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  if (!multiSelect) {
    return (
      <select
        value={categoryId}
        onChange={(event) => {
          const nextId = event.target.value
          onChange({
            categoryId: nextId,
            colour: resolveItemColour(categories, nextId),
          })
        }}
        className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
      >
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    )
  }

  const selected = outlookCategories
  const summary =
    selected.length === 0
      ? 'No category'
      : selected.length === 1
        ? selected[0]
        : `${selected.length} categories selected`

  const toggleOutlookCategory = (cat: Category) => {
    const has = selected.includes(cat.name)
    const next = has ? selected.filter((name) => name !== cat.name) : [...selected, cat.name]
    const primary = primaryFromOutlookSelection(categories, next, categoryId)
    onChange({
      categoryId: primary.categoryId,
      outlookCategories: next,
      colour: primary.colour,
    })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-left text-body outline-none transition-colors hover:border-wf-accent/30 focus:border-wf-accent"
      >
        <span className={selected.length === 0 ? 'text-wf-text-tertiary' : 'text-wf-text'}>
          {summary}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 text-wf-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-wf-border bg-wf-surface py-1 shadow-[var(--shadow-modal)]"
        >
          {categories.length === 0 ? (
            <p className="px-3 py-2 text-caption text-wf-text-tertiary">
              No categories — add them in Settings.
            </p>
          ) : (
            categories.map((cat) => {
              const checked = selected.includes(cat.name)
              return (
                <label
                  key={cat.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-body transition-colors hover:bg-black/[0.03]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOutlookCategory(cat)}
                    className="h-4 w-4 shrink-0 rounded border-wf-border text-wf-accent focus:ring-wf-accent/30"
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.colour }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-wf-text">{cat.name}</span>
                </label>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
