import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, CheckSquare, X } from 'lucide-react'
import type { CalendarSourceKind, CalendarSourcePreferences, UnifiedCalendarSource } from '../types'
import {
  calendarKindLabel,
  enabledCalendarIdSet,
  groupSourcesByAccountAndKind,
} from '../lib/calendarSources'
import { TASK_PROVIDER_CALENDAR_TOGGLE_DESCRIPTIONS, TASK_PROVIDER_LABELS } from '../lib/providerTasks'

interface CalendarSourcesPanelProps {
  open: boolean
  onClose: () => void
  sources: UnifiedCalendarSource[]
  prefs: CalendarSourcePreferences
  onChange: (prefs: CalendarSourcePreferences) => void
  showTodoToggle?: boolean
}

const KIND_ORDER: CalendarSourceKind[] = ['owned', 'shared', 'subscribed']

export function CalendarSourcesPanel({
  open,
  onClose,
  sources,
  prefs,
  onChange,
  showTodoToggle = true,
}: CalendarSourcesPanelProps) {
  const enabled = enabledCalendarIdSet(prefs, sources)
  const grouped = groupSourcesByAccountAndKind(sources)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const toggleCalendar = (sourceId: string, checked: boolean) => {
    const allIds = sources.map((source) => source.id)
    const current =
      prefs.enabledCalendarIds.length === 0 ? new Set(allIds) : new Set(prefs.enabledCalendarIds)
    if (checked) current.add(sourceId)
    else current.delete(sourceId)
    onChange({
      ...prefs,
      enabledCalendarIds: current.size === allIds.length ? [] : [...current],
    })
  }

  const setAccountSelection = (accountId: string, selectAll: boolean) => {
    const accountSourceIds = sources.filter((source) => source.accountId === accountId).map((s) => s.id)
    const allIds = sources.map((source) => source.id)
    const current =
      prefs.enabledCalendarIds.length === 0 ? new Set(allIds) : new Set(prefs.enabledCalendarIds)
    for (const id of accountSourceIds) {
      if (selectAll) current.add(id)
      else current.delete(id)
    }
    onChange({
      ...prefs,
      enabledCalendarIds: current.size === allIds.length ? [] : [...current],
    })
  }

  const panel = (
    <>
      <button
        type="button"
        aria-label="Close calendar list"
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Calendars"
        className="fixed inset-x-0 bottom-0 z-[61] max-h-[min(80vh,560px)] overflow-hidden rounded-t-2xl border border-wf-border bg-wf-bg shadow-[var(--shadow-elevated)] sm:inset-x-auto sm:left-auto sm:right-4 sm:top-16 sm:bottom-auto sm:w-[min(100vw-2rem,360px)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-wf-border px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-wf-accent" />
            <h2 className="font-display text-subhead font-bold text-wf-text">Calendars</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-wf-text-secondary hover:bg-wf-surface"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-2 py-2" style={{ maxHeight: 'calc(min(80vh, 560px) - 56px)' }}>
          {[...grouped.entries()].map(([accountId, account]) => {
            const accountSourceIds = sources
              .filter((source) => source.accountId === accountId)
              .map((source) => source.id)
            const allSelected = accountSourceIds.every((id) => enabled.has(id))
            const noneSelected = accountSourceIds.every((id) => !enabled.has(id))

            return (
              <section key={accountId} className="mb-3">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <p className="text-caption font-semibold text-wf-text-secondary">{account.label}</p>
                  <div className="flex gap-2 text-[11px] font-semibold text-wf-accent">
                    {!allSelected && (
                      <button type="button" onClick={() => setAccountSelection(accountId, true)}>
                        All
                      </button>
                    )}
                    {!noneSelected && (
                      <button type="button" onClick={() => setAccountSelection(accountId, false)}>
                        None
                      </button>
                    )}
                  </div>
                </div>

                {KIND_ORDER.map((kind) => {
                  const entries = account.groups.get(kind)
                  if (!entries?.length) return null
                  return (
                    <div key={kind} className="mb-1">
                      <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-wf-text-tertiary">
                        {calendarKindLabel(kind)}
                      </p>
                      {entries.map((source) => (
                        <label
                          key={source.id}
                          className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-wf-surface/80"
                        >
                          <input
                            type="checkbox"
                            checked={enabled.has(source.id)}
                            onChange={(event) => toggleCalendar(source.id, event.target.checked)}
                            className="h-4 w-4 rounded border-wf-border text-wf-accent focus:ring-wf-accent"
                          />
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: source.colour ?? '#8E8E93' }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate text-subhead text-wf-text">
                            {source.name}
                          </span>
                          {source.canEdit === false && (
                            <span className="shrink-0 rounded-full bg-wf-surface px-2 py-0.5 text-[10px] font-semibold text-wf-text-tertiary">
                              Read-only
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )
                })}
              </section>
            )
          })}

          {showTodoToggle && (
            <section className="mt-2 border-t border-wf-border pt-2 px-2 pb-2">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl py-2 hover:bg-wf-surface/80">
                <input
                  type="checkbox"
                  checked={prefs.showMicrosoftTodoTasks}
                  onChange={(event) =>
                    onChange({ ...prefs, showMicrosoftTodoTasks: event.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-wf-border text-wf-accent focus:ring-wf-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-subhead font-medium text-wf-text">
                    <CheckSquare size={16} className="shrink-0 text-wf-accent" />
                    {TASK_PROVIDER_LABELS.microsoft} on calendar
                  </span>
                  <span className="mt-0.5 block text-caption text-wf-text-tertiary">
                    {TASK_PROVIDER_CALENDAR_TOGGLE_DESCRIPTIONS.microsoft}
                  </span>
                </span>
              </label>
            </section>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(panel, document.body)
}
