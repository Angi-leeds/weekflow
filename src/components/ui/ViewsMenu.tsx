import { useEffect, useRef, useState } from 'react'
import { Check, LayoutGrid } from 'lucide-react'
import type { CalendarViewMode } from '../../types'

export type PrimaryCalendarTab = 'week' | 'today' | 'month'

interface ViewsMenuProps {
  viewMode: CalendarViewMode
  onViewChange: (mode: CalendarViewMode) => void
}

const SECONDARY_VIEWS: { mode: CalendarViewMode; label: string; description: string }[] = [
  { mode: 'week-board', label: 'Board', description: '7-column week layout' },
  { mode: 'week-timeline', label: 'Timeline', description: 'Hourly week grid' },
  { mode: 'day', label: 'Day', description: 'Single day focus' },
  { mode: 'agenda', label: 'Agenda', description: 'Chronological list' },
  { mode: 'year', label: 'Year', description: 'Year overview' },
]

export function getPrimaryTab(viewMode: CalendarViewMode, selectedDayIsToday: boolean): PrimaryCalendarTab | null {
  if (viewMode === 'month') return 'month'
  if (viewMode === 'day' && selectedDayIsToday) return 'today'
  if (['week-list', 'week-board', 'week-timeline'].includes(viewMode)) return 'week'
  return null
}

export function ViewsMenu({ viewMode, onViewChange }: ViewsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isSecondaryActive = SECONDARY_VIEWS.some((v) => v.mode === viewMode)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-subhead font-semibold transition-all active:scale-95 ${
          isSecondaryActive
            ? 'bg-wf-accent text-white shadow-[var(--shadow-card)]'
            : 'bg-wf-surface text-wf-text-secondary shadow-[var(--shadow-card)] hover:text-wf-text'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <LayoutGrid size={16} strokeWidth={1.75} />
        Views
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 min-w-[220px] animate-scale-in overflow-hidden rounded-2xl bg-wf-surface py-1 shadow-[var(--shadow-modal)]"
        >
          {SECONDARY_VIEWS.map(({ mode, label, description }) => {
            const active = viewMode === mode
            return (
              <button
                key={mode}
                type="button"
                role="menuitem"
                onClick={() => {
                  onViewChange(mode)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.03] ${
                  active ? 'bg-wf-accent-soft' : ''
                }`}
              >
                <span className="flex-1">
                  <span className={`block text-body font-medium ${active ? 'text-wf-accent' : 'text-wf-text'}`}>
                    {label}
                  </span>
                  <span className="block text-caption text-wf-text-tertiary">{description}</span>
                </span>
                {active && <Check size={16} className="shrink-0 text-wf-accent" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
