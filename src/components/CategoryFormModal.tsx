import { useEffect, useState } from 'react'
import type { Category, CategoryKind } from '../types'
import { CATEGORY_KIND_LABELS, COLOUR_PRESETS, defaultShowInDiaryForKind } from '../categories'
import { DIARY_SETTINGS } from '../lib/diaryHelpCopy'

interface CategoryFormModalProps {
  open: boolean
  category?: Category | null
  onSave: (category: Category) => void
  onClose: () => void
}

const emptyForm = (): Omit<Category, 'id'> => ({
  name: '',
  colour: COLOUR_PRESETS[0],
  kind: 'event',
  showInDiary: undefined,
})

export function CategoryFormModal({ open, category, onSave, onClose }: CategoryFormModalProps) {
  const [form, setForm] = useState(emptyForm)
  const isEdit = Boolean(category?.id)

  useEffect(() => {
    if (open) {
      setForm(
        category
          ? {
              name: category.name,
              colour: category.colour,
              kind: category.kind,
              showInDiary: category.showInDiary,
            }
          : emptyForm(),
      )
    }
  }, [open, category])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    onSave({
      id: category?.id ?? '',
      name,
      colour: form.colour,
      kind: form.kind,
      isDefault: category?.isDefault,
      showInDiary:
        form.kind === 'event'
          ? undefined
          : form.showInDiary ?? defaultShowInDiaryForKind(form.kind),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 animate-fade-in backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-lg animate-slide-up rounded-t-3xl bg-wf-surface px-5 pb-8 pt-4 shadow-[var(--shadow-modal)] safe-bottom sm:mx-4 sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-wf-border sm:hidden" />

        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-bold">
            {isEdit ? 'Edit category' : 'New category'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[15px] font-medium text-wf-accent"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Work, Health, Errands"
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-[16px] outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
              autoFocus
            />
          </Field>

          <Field label="Kind">
            <select
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value as CategoryKind
                setForm({
                  ...form,
                  kind,
                  showInDiary:
                    kind === 'event' ? undefined : defaultShowInDiaryForKind(kind),
                })
              }}
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-body outline-none focus:border-wf-accent"
            >
              {(Object.keys(CATEGORY_KIND_LABELS) as CategoryKind[]).map((k) => (
                <option key={k} value={k}>
                  {CATEGORY_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Colour">
            <div className="mb-3 flex flex-wrap gap-2">
              {COLOUR_PRESETS.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  onClick={() => setForm({ ...form, colour })}
                  className={`h-9 w-9 rounded-full transition-transform active:scale-95 ${
                    form.colour === colour ? 'ring-2 ring-wf-accent ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: colour }}
                  aria-label={`Colour ${colour}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span
                className="h-10 w-10 shrink-0 rounded-xl border border-wf-border"
                style={{ backgroundColor: form.colour }}
              />
              <input
                type="text"
                value={form.colour}
                onChange={(e) => setForm({ ...form, colour: e.target.value })}
                placeholder="#2D6A6A"
                className="min-w-0 flex-1 rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 font-mono text-body outline-none focus:border-wf-accent"
              />
            </div>
          </Field>

          {(form.kind === 'task' || form.kind === 'reminder') && (
            <label className="flex items-start gap-3 rounded-xl bg-wf-bg px-4 py-3">
              <input
                type="checkbox"
                checked={form.showInDiary ?? defaultShowInDiaryForKind(form.kind) ?? false}
                onChange={(e) => setForm({ ...form, showInDiary: e.target.checked })}
                className="mt-0.5 h-5 w-5 shrink-0 rounded accent-wf-accent"
              />
              <span>
                <span className="block text-[15px] font-medium text-wf-text">
                  {DIARY_SETTINGS.categoryToggleLabel}
                </span>
                <span className="mt-0.5 block text-caption text-wf-text-tertiary">
                  {DIARY_SETTINGS.categoryToggleDescription}
                </span>
              </span>
            </label>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-wf-accent py-3.5 text-[16px] font-semibold text-white shadow-lg shadow-wf-accent/25 transition-transform active:scale-[0.98]"
          >
            {isEdit ? 'Save category' : 'Add category'}
          </button>
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
