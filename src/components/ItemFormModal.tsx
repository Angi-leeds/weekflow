import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import type { EntityType, ItemLink } from '../../shared/links'
import type { BoardDisplay, ItemShare, UpsertItemShareInput } from '../../shared/itemShares'
import type { CalendarItem, Category, EmailMessage } from '../types'
import { resolveItemColour } from '../categories'
import { generateId, toISODate } from '../dateUtils'
import { getItemLinkType } from '../lib/itemLinkHelpers'
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
  itemShare?: ItemShare
  onShareUpdate: (input: UpsertItemShareInput) => void
  onSave: (item: CalendarItem) => void
  onDelete?: (id: string) => void
  onClose: () => void
  onNavigateLink: (type: EntityType, id: string) => void
  onLinkExisting?: () => void
  onRemoveLink?: (linkId: string) => void
}
const emptyForm = (date: Date, categories: Category[]): CalendarItem => {
  const defaultCat = categories.find((c) => c.id === 'appointment') ?? categories[0]
  return {
    id: '',
    title: '',
    date: toISODate(date),
    allDay: false,
    categoryId: defaultCat.id,
    colour: defaultCat.colour,
    notes: '',
    completed: false,
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
  itemShare,
  onShareUpdate,
  onSave,
  onDelete,
  onClose,
  onNavigateLink,
  onLinkExisting,
  onRemoveLink,
}: ItemFormModalProps) {
  const [form, setForm] = useState<CalendarItem>(() => emptyForm(defaultDate, categories))
  const isEdit = Boolean(item?.id)

  useEffect(() => {
    if (open) {
      setForm(item?.id ? { ...item } : emptyForm(defaultDate, categories))
    }
  }, [open, item, defaultDate, categories])

  if (!open) return null

  const entityType = form.id ? getItemLinkType(form, categories) : null
  const shareState = shareStateFromRecord(itemShare)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const endDate =
      form.endDate && form.endDate > form.date ? form.endDate : undefined
    onSave({
      ...form,
      id: form.id || generateId(),
      title: form.title.trim(),
      endDate,
      colour: resolveItemColour(categories, form.categoryId),
      completed: isTaskOrReminder(form, categories) ? form.completed : undefined,
    })
    onClose()
  }

  const selectCategory = (categoryId: string) => {
    setForm({
      ...form,
      categoryId,
      colour: resolveItemColour(categories, categoryId),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 animate-fade-in backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-lg animate-slide-up rounded-t-3xl bg-wf-surface px-5 pb-8 pt-4 shadow-[var(--shadow-modal)] safe-bottom sm:rounded-3xl sm:mx-4">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-wf-border sm:hidden" />

        <div className="mb-5 flex items-center justify-between">
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-body transition-all active:scale-[0.98] ${
                    form.categoryId === cat.id
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

          {form.allDay && !form.endDate && (
            <p className="text-caption text-wf-text-tertiary">
              Leave end date empty for a single-day event, or set it to span multiple days.
            </p>
          )}

          <label className="flex items-center gap-3 rounded-xl bg-wf-bg px-4 py-3">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) =>
                setForm({
                  ...form,
                  allDay: e.target.checked,
                  startTime: e.target.checked ? undefined : form.startTime,
                  endDate: e.target.checked ? form.endDate : undefined,
                })
              }
              className="h-5 w-5 rounded accent-wf-accent"
            />
            <span className="text-[15px] font-medium">All day</span>
          </label>

          {!form.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <input
                  type="time"
                  value={form.startTime ?? ''}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value || undefined })}
                  className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-[15px] outline-none focus:border-wf-accent"
                />
              </Field>
              <Field label="End">
                <input
                  type="time"
                  value={form.endTime ?? ''}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value || undefined })}
                  className="w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-3 text-[15px] outline-none focus:border-wf-accent"
                />
              </Field>
            </div>
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
