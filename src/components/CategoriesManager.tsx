import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Category } from '../types'
import { CATEGORY_KIND_LABELS } from '../categories'
import { CategoryFormModal } from './CategoryFormModal'

interface CategoriesManagerProps {
  categories: Category[]
  itemCounts: Record<string, number>
  onSave: (category: Category) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  outlookSynced?: boolean
}

export function CategoriesManager({
  categories,
  itemCounts,
  onSave,
  onDelete,
  outlookSynced = false,
}: CategoriesManagerProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setModalOpen(true)
  }

  const handleDelete = (cat: Category) => {
    const count = itemCounts[cat.id] ?? 0
    const msg =
      count > 0
        ? `Delete "${cat.name}"? ${count} item${count === 1 ? '' : 's'} will move to Work.`
        : `Delete "${cat.name}"?`
    if (window.confirm(msg)) onDelete(cat.id)
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-wf-surface shadow-[var(--shadow-card)]">
        {categories.map((cat, i) => (
          <div
            key={cat.id}
            className={`flex items-center gap-3 px-4 py-3.5 ${
              i < categories.length - 1 ? 'border-b border-wf-border/50' : ''
            }`}
          >
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: cat.colour }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-wf-text">{cat.name}</p>
              <p className="text-caption text-wf-text-tertiary">
                {outlookSynced
                  ? 'Synced with Outlook'
                  : CATEGORY_KIND_LABELS[cat.kind]}
                {(itemCounts[cat.id] ?? 0) > 0 && ` · ${itemCounts[cat.id]} items`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openEdit(cat)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-wf-text-secondary transition-colors hover:bg-black/[0.04] hover:text-wf-accent"
              aria-label={`Edit ${cat.name}`}
            >
              <Pencil size={16} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(cat)}
              disabled={categories.length <= 1}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-wf-text-secondary transition-colors hover:bg-wf-red/10 hover:text-wf-red disabled:opacity-30"
              aria-label={`Delete ${cat.name}`}
            >
              <Trash2 size={16} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={openAdd}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-wf-border bg-wf-surface py-3.5 text-body font-semibold text-wf-accent transition-colors hover:border-wf-accent/40 hover:bg-wf-accent-soft/30"
      >
        <Plus size={18} strokeWidth={2} />
        Add category
      </button>

      <CategoryFormModal
        open={modalOpen}
        category={editing}
        onSave={onSave}
        onClose={() => setModalOpen(false)}
        outlookMode={outlookSynced}
      />
    </>
  )
}
