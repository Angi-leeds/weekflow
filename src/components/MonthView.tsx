import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarItem } from '../types'
import {
  formatMonthYear,
  getItemsForDate,
  getMonthGrid,
  isSameDay,
  isToday,
  toISODate,
} from '../dateUtils'

interface MonthViewProps {
  currentDate: Date
  items: CalendarItem[]
  onDaySelect: (date: Date) => void
  onMonthChange: (date: Date) => void
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function MonthView({
  currentDate,
  items,
  onDaySelect,
  onMonthChange,
}: MonthViewProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const weeks = getMonthGrid(year, month)

  const countForDay = (date: Date) => getItemsForDate(items, date).length

  return (
    <div className="px-4 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, month - 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-wf-surface text-wf-accent shadow-[var(--shadow-card)] transition-transform active:scale-95"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <h2 className="font-display text-title font-bold tracking-tight">
          {formatMonthYear(currentDate)}
        </h2>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, month + 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-wf-surface text-wf-accent shadow-[var(--shadow-card)] transition-transform active:scale-95"
          aria-label="Next month"
        >
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </div>

      <div className="rounded-2xl bg-wf-surface p-4 shadow-[var(--shadow-card)]">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="py-1 text-center text-caption font-semibold text-wf-text-secondary">
              {label}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day, di) => {
                if (!day) {
                  return <div key={di} className="aspect-square" />
                }

                const count = countForDay(day)
                const today = isToday(day)
                const selected = isSameDay(day, currentDate)

                return (
                  <button
                    key={di}
                    type="button"
                    onClick={() => onDaySelect(day)}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-xl transition-colors ${
                      today
                        ? 'bg-wf-accent text-white'
                        : selected
                          ? 'bg-wf-accent-soft text-wf-accent'
                          : 'hover:bg-black/[0.04] active:bg-black/[0.06]'
                    }`}
                  >
                    <span className={`text-body font-medium ${today ? 'font-bold' : ''}`}>
                      {day.getDate()}
                    </span>
                    {count > 0 && (
                      <span className="mt-0.5 flex gap-0.5">
                        {count <= 3 ? (
                          Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-1 w-1 rounded-full ${today ? 'bg-white/80' : 'bg-wf-accent'}`}
                            />
                          ))
                        ) : (
                          <span className={`text-[9px] font-bold ${today ? 'text-white/90' : 'text-wf-accent'}`}>
                            {count}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { toISODate }
