import { useEffect, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import type { Category, CategoryKind } from '../types'
import type { CategoryAutomation, CategoryRecurrenceKind } from '../../shared/categoryAutomation'
import { DEFAULT_CATEGORY_AUTOMATION } from '../../shared/categoryAutomation'
import { CATEGORY_RECURRENCE_KIND_LABELS } from '../../shared/itemRecurrence'
import { CATEGORY_KIND_LABELS, COLOUR_PRESETS, defaultShowInDiaryForKind } from '../categories'
import { DIARY_SETTINGS } from '../lib/diaryHelpCopy'
import { REMINDER_PRESET_DAYS, formatTaskReminderSummary } from '../lib/reminderTiming'
import {
  OUTLOOK_PRESET_HEX,
  OUTLOOK_PRESET_OPTIONS,
  type OutlookCategoryPreset,
} from '../../shared/outlookCategoryColors'
import { weekflowCategoryToOutlookPreset } from '../lib/outlookCategories'

interface CategoryFormModalProps {
  open: boolean
  category?: Category | null
  automation?: CategoryAutomation
  onSave: (category: Category, automation?: CategoryAutomation) => void
  onClose: () => void
  outlookMode?: boolean
}

const emptyForm = (outlookMode: boolean): Omit<Category, 'id'> => ({
  name: '',
  colour: outlookMode ? OUTLOOK_PRESET_HEX.preset7 : COLOUR_PRESETS[0],
  kind: 'event',
  showInDiary: undefined,
  outlookPreset: outlookMode ? 'preset7' : undefined,
})

export function CategoryFormModal({
  open,
  category,
  automation,
  onSave,
  onClose,
  outlookMode = false,
}: CategoryFormModalProps) {
  const [form, setForm] = useState(emptyForm(outlookMode))
  const [autoForm, setAutoForm] = useState<CategoryAutomation>(DEFAULT_CATEGORY_AUTOMATION)
  const [keywordDraft, setKeywordDraft] = useState('')
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
              outlookPreset: category.outlookPreset,
              outlookGraphId: category.outlookGraphId,
            }
          : emptyForm(outlookMode),
      )
      setAutoForm(
        automation
          ? { ...DEFAULT_CATEGORY_AUTOMATION, ...automation }
          : { ...DEFAULT_CATEGORY_AUTOMATION },
      )
      setKeywordDraft('')
    }
  }, [open, category, automation, outlookMode])

  if (!open) return null

  const addKeyword = (raw: string) => {
    const word = raw.trim()
    if (!word) return
    if (autoForm.keywords.some((k) => k.toLowerCase() === word.toLowerCase())) return
    setAutoForm((prev) => ({ ...prev, keywords: [...prev.keywords, word] }))
    setKeywordDraft('')
  }

  const handleKeywordKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addKeyword(keywordDraft)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    const preset = outlookMode
      ? (form.outlookPreset ?? weekflowCategoryToOutlookPreset({ colour: form.colour }))
      : undefined
    const savedCategory: Category = {
      id: category?.id ?? '',
      name,
      colour: outlookMode && preset ? OUTLOOK_PRESET_HEX[preset as OutlookCategoryPreset] : form.colour,
      kind: outlookMode ? 'event' : form.kind,
      isDefault: category?.isDefault,
      showInDiary: outlookMode
        ? undefined
        : form.kind === 'event'
          ? undefined
          : form.showInDiary ?? defaultShowInDiaryForKind(form.kind),
      outlookPreset: preset,
      outlookGraphId: category?.outlookGraphId,
    }
    const automationToSave: CategoryAutomation = {
      ...autoForm,
      keywords: autoForm.keywords.map((k) => k.trim()).filter(Boolean),
    }
    onSave(savedCategory, automationToSave)
    onClose()
  }

  const selectOutlookPreset = (preset: OutlookCategoryPreset) => {
    setForm({
      ...form,
      colour: OUTLOOK_PRESET_HEX[preset],
      outlookPreset: preset,
    })
  }

  const recurrenceKind = autoForm.recurrence?.kind ?? 'none'
  const intervalDays = autoForm.recurrence?.intervalDays ?? 30

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 animate-fade-in backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto animate-slide-up rounded-t-3xl bg-wf-surface px-5 pb-8 pt-4 shadow-[var(--shadow-modal)] safe-bottom sm:mx-4 sm:rounded-3xl">
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

        {outlookMode && (
          <p className="mb-4 text-caption text-wf-text-tertiary">
            Synced with Outlook — same list as the Categorize menu. Auto-apply rules sync with your
            Weekflow account so they work on every device you use.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Work, Birthday, Pay day"
              className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-[16px] outline-none focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
              autoFocus
            />
          </Field>

          {!outlookMode && (
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
          )}

          <Field label="Colour">
            {outlookMode ? (
              <div className="flex flex-wrap gap-2">
                {OUTLOOK_PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => selectOutlookPreset(preset)}
                    className={`h-9 w-9 rounded-full transition-transform active:scale-95 ${
                      form.outlookPreset === preset ? 'ring-2 ring-wf-accent ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: OUTLOOK_PRESET_HEX[preset] }}
                    aria-label={preset}
                  />
                ))}
              </div>
            ) : (
              <>
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
              </>
            )}
          </Field>

          {!outlookMode && (form.kind === 'task' || form.kind === 'reminder') && (
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

          <div className="rounded-xl border border-wf-border bg-wf-bg/60 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={autoForm.enabled}
                onChange={(e) => setAutoForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="mt-0.5 h-5 w-5 shrink-0 rounded accent-wf-accent"
              />
              <span>
                <span className="block text-[15px] font-semibold text-wf-text">Auto-apply rules</span>
                <span className="mt-0.5 block text-caption text-wf-text-tertiary">
                  When a new entry title contains these words, Weekflow applies this category and
                  defaults on save.
                </span>
              </span>
            </label>

            {autoForm.enabled && (
              <div className="mt-4 space-y-4 border-t border-wf-border/60 pt-4">
                <Field label="Keywords">
                  <div className="flex flex-wrap gap-2">
                    {autoForm.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center gap-1 rounded-full bg-wf-surface px-2.5 py-1 text-caption font-medium text-wf-text-secondary shadow-[var(--shadow-card)]"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() =>
                            setAutoForm((prev) => ({
                              ...prev,
                              keywords: prev.keywords.filter((k) => k !== keyword),
                            }))
                          }
                          className="rounded-full p-0.5 text-wf-text-tertiary hover:text-wf-text"
                          aria-label={`Remove ${keyword}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={keywordDraft}
                    onChange={(e) => setKeywordDraft(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    onBlur={() => addKeyword(keywordDraft)}
                    placeholder="Type a word and press Enter — e.g. birthday"
                    className="mt-2 w-full rounded-xl border border-wf-border bg-wf-surface px-3 py-2.5 text-body outline-none focus:border-wf-accent"
                  />
                </Field>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean(autoForm.matchInNotes)}
                    onChange={(e) =>
                      setAutoForm((prev) => ({ ...prev, matchInNotes: e.target.checked }))
                    }
                    className="h-4 w-4 rounded accent-wf-accent"
                  />
                  <span className="text-caption text-wf-text-secondary">Also match in notes</span>
                </label>

                <Field label="Default reminder (event alert)">
                  <select
                    value={autoForm.reminderLeadDays ?? ''}
                    onChange={(e) =>
                      setAutoForm((prev) => ({
                        ...prev,
                        reminderLeadDays: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="w-full rounded-xl border border-wf-border bg-wf-surface px-3 py-2.5 text-body outline-none focus:border-wf-accent"
                  >
                    <option value="">None</option>
                    {REMINDER_PRESET_DAYS.map((days) => (
                      <option key={days} value={days}>
                        {formatTaskReminderSummary({
                          taskReminderKind: 'offset',
                          taskLeadDays: days,
                        })}{' '}
                        due date
                      </option>
                    ))}
                    <option value="12">12 days before due date</option>
                  </select>
                </Field>

                <Field label="Default recurrence">
                  <select
                    value={recurrenceKind}
                    onChange={(e) => {
                      const kind = e.target.value as CategoryRecurrenceKind
                      setAutoForm((prev) => ({
                        ...prev,
                        recurrence:
                          kind === 'none'
                            ? { kind: 'none' }
                            : {
                                kind,
                                intervalDays:
                                  kind === 'intervalDays' ? intervalDays : undefined,
                              },
                      }))
                    }}
                    className="w-full rounded-xl border border-wf-border bg-wf-surface px-3 py-2.5 text-body outline-none focus:border-wf-accent"
                  >
                    {(Object.keys(CATEGORY_RECURRENCE_KIND_LABELS) as CategoryRecurrenceKind[]).map(
                      (kind) => (
                        <option key={kind} value={kind}>
                          {CATEGORY_RECURRENCE_KIND_LABELS[kind]}
                        </option>
                      ),
                    )}
                  </select>
                  {recurrenceKind === 'intervalDays' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-caption text-wf-text-secondary">Every</span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={intervalDays}
                        onChange={(e) =>
                          setAutoForm((prev) => ({
                            ...prev,
                            recurrence: {
                              kind: 'intervalDays',
                              intervalDays: Math.max(1, Number(e.target.value) || 30),
                            },
                          }))
                        }
                        className="w-20 rounded-xl border border-wf-border bg-wf-surface px-3 py-2 text-body outline-none focus:border-wf-accent"
                      />
                      <span className="text-caption text-wf-text-secondary">days</span>
                    </div>
                  )}
                </Field>
              </div>
            )}
          </div>

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
