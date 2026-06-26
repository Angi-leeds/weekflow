import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  getMonthGridFilled,
  isSameDay,
  isToday,
  toISODate,
} from '../dateUtils'
import type { WeekStartsOn } from '../types'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function headerWeekdayLabels(weekStartsOn: WeekStartsOn): string[] {
  return Array.from({ length: 7 }, (_, index) => WEEKDAY_LABELS[(weekStartsOn + index) % 7])
}

interface MiniMonthPickerProps {
  viewMonth: Date
  weekStartsOn: WeekStartsOn
  selectedDate?: Date
  onViewMonthChange: (month: Date) => void
  onSelectDate: (date: Date) => void
}

export function MiniMonthPicker({
  viewMonth,
  weekStartsOn,
  selectedDate,
  onViewMonthChange,
  onSelectDate,
}: MiniMonthPickerProps) {
  const weeks = useMemo(
    () => getMonthGridFilled(viewMonth.getFullYear(), viewMonth.getMonth(), weekStartsOn),
    [viewMonth, weekStartsOn],
  )

  const monthLabel = viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onViewMonthChange(addMonths(viewMonth, -1))}
          className="flex h-6 w-6 items-center justify-center rounded-md text-wf-text-secondary hover:bg-wf-bg"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <p className="min-w-0 truncate text-[11px] font-semibold text-wf-text">{monthLabel}</p>
        <button
          type="button"
          onClick={() => onViewMonthChange(addMonths(viewMonth, 1))}
          className="flex h-6 w-6 items-center justify-center rounded-md text-wf-text-secondary hover:bg-wf-bg"
          aria-label="Next month"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="mb-0.5 grid grid-cols-7 gap-0.5">
        {headerWeekdayLabels(weekStartsOn).map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="text-center text-[9px] font-medium text-wf-text-tertiary"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((day) => {
          const inMonth = day.getMonth() === viewMonth.getMonth()
          const selected = selectedDate ? isSameDay(day, selectedDate) : false
          const today = isToday(day)

          return (
            <button
              key={toISODate(day)}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`flex h-7 items-center justify-center rounded-md text-[11px] font-medium tabular-nums transition-colors ${
                selected
                  ? 'bg-wf-accent text-white'
                  : today
                    ? 'bg-wf-accent-soft text-wf-accent'
                    : inMonth
                      ? 'text-wf-text hover:bg-wf-bg'
                      : 'text-wf-text-tertiary hover:bg-wf-bg/80'
              }`}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
