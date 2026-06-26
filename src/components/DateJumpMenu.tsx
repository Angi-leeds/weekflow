import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarRange } from 'lucide-react'
import type { DateJumpAnchor } from '../lib/dateOffset'
import {
  computeJumpDate,
  formatJumpAnchorLabel,
  jumpTargetPreview,
} from '../lib/dateOffset'
import type { WeekStartsOn } from '../types'
import { MiniMonthPicker } from './MiniMonthPicker'

interface DateJumpMenuProps {
  referenceDate: Date
  onJump: (date: Date) => void
  weekStartsOn?: WeekStartsOn
  className?: string
}

const WEEK_PRESETS = [-4, -2, -1, 1, 2, 4]
const DAY_PRESETS = [-14, -7, -1, 1, 7, 14]
const PANEL_WIDTH = 272

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function DateJumpMenu({
  referenceDate,
  onJump,
  weekStartsOn = 1,
  className = '',
}: DateJumpMenuProps) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<DateJumpAnchor>('today')
  const [weeks, setWeeks] = useState(0)
  const [days, setDays] = useState(0)
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(referenceDate))
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    setViewMonth(startOfMonth(referenceDate))
    setWeeks(0)
    setDays(0)
  }, [open, referenceDate])

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return

    const updatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect()
      const left = Math.min(
        Math.max(8, rect.right - PANEL_WIDTH),
        window.innerWidth - PANEL_WIDTH - 8,
      )
      setPanelStyle({ top: rect.bottom + 6, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const preview = jumpTargetPreview(anchor, referenceDate, weeks, days)

  const applyJump = () => {
    onJump(computeJumpDate(anchor, referenceDate, weeks, days))
    setOpen(false)
  }

  const pickDate = (date: Date) => {
    onJump(date)
    setOpen(false)
  }

  const panel = open ? (
    <>
      <button
        type="button"
        aria-label="Close jump menu"
        className="fixed inset-0 z-[199] cursor-default bg-black/20"
        onClick={() => setOpen(false)}
      />
      <div
        className="fixed z-[200] overflow-hidden rounded-xl border border-wf-border bg-wf-surface shadow-[var(--shadow-modal)]"
        style={{ top: panelStyle.top, left: panelStyle.left, width: PANEL_WIDTH }}
      >
        <div className="border-b border-wf-border bg-wf-surface px-3 py-2">
          <p className="text-[11px] font-semibold text-wf-text">Jump to date</p>
        </div>

        <div className="space-y-2.5 bg-wf-surface p-2.5">
          <MiniMonthPicker
            viewMonth={viewMonth}
            weekStartsOn={weekStartsOn}
            selectedDate={referenceDate}
            onViewMonthChange={setViewMonth}
            onSelectDate={pickDate}
          />

          <div className="border-t border-wf-border pt-2">
            <div className="mb-1.5 flex rounded-lg bg-wf-bg p-0.5">
              {(['today', 'reference'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAnchor(value)}
                  className={`flex-1 rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                    anchor === value
                      ? 'bg-wf-surface text-wf-accent shadow-sm'
                      : 'text-wf-text-secondary hover:text-wf-text'
                  }`}
                >
                  {formatJumpAnchorLabel(value, referenceDate)}
                </button>
              ))}
            </div>

            <div className="mb-1.5 grid grid-cols-2 gap-1.5">
              <label className="text-[10px] font-medium text-wf-text-secondary">
                Weeks
                <input
                  type="number"
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value) || 0)}
                  className="mt-0.5 w-full rounded-md border border-wf-border bg-wf-bg px-2 py-1 text-[11px] outline-none focus:border-wf-accent"
                />
              </label>
              <label className="text-[10px] font-medium text-wf-text-secondary">
                Days
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value) || 0)}
                  className="mt-0.5 w-full rounded-md border border-wf-border bg-wf-bg px-2 py-1 text-[11px] outline-none focus:border-wf-accent"
                />
              </label>
            </div>

            <div className="mb-1.5 flex flex-wrap gap-0.5">
              {WEEK_PRESETS.map((value) => (
                <button
                  key={`w-${value}`}
                  type="button"
                  onClick={() => setWeeks(value)}
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    weeks === value
                      ? 'bg-wf-accent text-white'
                      : 'bg-wf-bg text-wf-text-secondary ring-1 ring-wf-border/80'
                  }`}
                >
                  {value > 0 ? `+${value}w` : `${value}w`}
                </button>
              ))}
              {DAY_PRESETS.map((value) => (
                <button
                  key={`d-${value}`}
                  type="button"
                  onClick={() => setDays(value)}
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    days === value
                      ? 'bg-wf-accent text-white'
                      : 'bg-wf-bg text-wf-text-secondary ring-1 ring-wf-border/80'
                  }`}
                >
                  {value > 0 ? `+${value}d` : `${value}d`}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={applyJump}
              className="w-full rounded-lg bg-wf-accent py-1.5 text-[11px] font-semibold text-white active:scale-[0.98]"
            >
              Go to {preview}
            </button>
          </div>
        </div>
      </div>
    </>
  ) : null

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wf-surface text-wf-text-secondary shadow-[var(--shadow-card)] ring-1 ring-wf-border/70 transition-colors hover:bg-wf-accent-soft hover:text-wf-accent active:scale-95"
        aria-label="Jump to date"
        title="Jump weeks or days from today or this date"
        aria-expanded={open}
      >
        <CalendarRange size={13} strokeWidth={2} />
      </button>

      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
