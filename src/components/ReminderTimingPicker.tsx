import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import {
  formatTaskReminderSummary,
  leadDaysFromAmount,
  REMINDER_PRESET_DAYS,
  splitLeadDays,
  type ReminderTimingValue,
} from '../lib/reminderTiming'
import { addDays, parseDate, toISODate } from '../dateUtils'

interface ReminderTimingPickerProps {
  dueDate: string
  value: ReminderTimingValue
  onChange: (value: ReminderTimingValue) => void
}

const fieldClass =
  'w-full rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-body outline-none focus:border-wf-accent'

export function ReminderTimingPicker({ dueDate, value, onChange }: ReminderTimingPickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const customSplit = useMemo(() => splitLeadDays(value.leadDays), [value.leadDays])
  const [customAmount, setCustomAmount] = useState(String(customSplit.amount))
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks'>(customSplit.unit)

  const maxReminderDate = dueDate ? toISODate(addDays(parseDate(dueDate), -1)) : undefined

  useEffect(() => {
    if (!open) return
    const split = splitLeadDays(value.leadDays)
    setCustomAmount(String(split.amount))
    setCustomUnit(split.unit)
  }, [open, value.leadDays])

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

  const summary = formatTaskReminderSummary({
    taskReminderKind: value.kind,
    taskLeadDays: value.leadDays,
    taskReminderDate: value.reminderDate,
  })

  const selectPreset = (days: number) => {
    onChange({ kind: 'offset', leadDays: days, reminderDate: undefined })
    setOpen(false)
  }

  const applyCustom = () => {
    const amount = Math.max(1, Math.floor(Number(customAmount)) || 1)
    onChange({
      kind: 'offset',
      leadDays: leadDaysFromAmount(amount, customUnit),
      reminderDate: undefined,
    })
  }

  const selectDate = (date: string) => {
    onChange({ kind: 'date', leadDays: value.leadDays, reminderDate: date })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-wf-border bg-wf-bg px-3 py-2.5 text-left text-body outline-none transition-colors hover:border-wf-accent/30 focus:border-wf-accent ${open ? 'border-wf-accent' : ''}`}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 text-wf-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-wf-border bg-wf-surface shadow-[var(--shadow-modal)]">
          <div className="max-h-[min(280px,50vh)] overflow-y-auto p-2">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-wf-text-tertiary">
              Quick picks
            </p>
            <div className="grid grid-cols-2 gap-1">
              {REMINDER_PRESET_DAYS.map((days) => {
                const active =
                  value.kind === 'offset' &&
                  value.leadDays === days &&
                  !value.reminderDate
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => selectPreset(days)}
                    className={`rounded-lg px-3 py-2 text-left text-subhead font-medium transition-colors ${
                      active
                        ? 'bg-wf-accent-soft text-wf-accent'
                        : 'text-wf-text hover:bg-black/[0.04]'
                    }`}
                  >
                    {formatTaskReminderSummary({ taskReminderKind: 'offset', taskLeadDays: days })}
                  </button>
                )
              })}
            </div>

            <div className="my-2 border-t border-wf-border" />

            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-wf-text-tertiary">
              Custom
            </p>
            <div className="flex items-center gap-2 px-1">
              <input
                type="number"
                min={1}
                max={customUnit === 'weeks' ? 52 : 365}
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                onBlur={applyCustom}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    applyCustom()
                  }
                }}
                className={`${fieldClass} min-w-0 flex-1`}
                aria-label="Reminder amount"
              />
              <select
                value={customUnit}
                onChange={(event) => {
                  const unit = event.target.value as 'days' | 'weeks'
                  setCustomUnit(unit)
                  const amount = Math.max(1, Math.floor(Number(customAmount)) || 1)
                  onChange({
                    kind: 'offset',
                    leadDays: leadDaysFromAmount(amount, unit),
                    reminderDate: undefined,
                  })
                }}
                className={`${fieldClass} w-[7.5rem] shrink-0`}
                aria-label="Reminder unit"
              >
                <option value="days">days</option>
                <option value="weeks">weeks</option>
              </select>
            </div>
            <p className="mt-1 px-2 text-[11px] text-wf-text-tertiary">before due date</p>

            <div className="my-2 border-t border-wf-border" />

            <p className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-wf-text-tertiary">
              <CalendarDays size={12} aria-hidden />
              Pick a date
            </p>
            <div className="px-1 pb-1">
              <input
                type="date"
                value={value.kind === 'date' ? (value.reminderDate ?? '') : ''}
                max={maxReminderDate}
                disabled={!dueDate}
                onChange={(event) => {
                  if (event.target.value) selectDate(event.target.value)
                }}
                className={fieldClass}
              />
              {!dueDate && (
                <p className="mt-1 px-1 text-[11px] text-wf-text-tertiary">
                  Set a due date first to pick a reminder date.
                </p>
              )}
              {dueDate && value.kind === 'date' && value.reminderDate && (
                <p className="mt-1 px-1 text-[11px] text-wf-text-tertiary">
                  Reminder on{' '}
                  {formatTaskReminderSummary({
                    taskReminderKind: 'date',
                    taskLeadDays: value.leadDays,
                    taskReminderDate: value.reminderDate,
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
