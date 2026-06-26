import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { WeekStartsOn } from '../types'
import { ViewDateTitle } from './ViewDateTitle'

interface CalendarViewHeaderProps {
  title: string
  referenceDate: Date
  onJumpToDate?: (date: Date) => void
  weekStartsOn?: WeekStartsOn
  onPrevious?: () => void
  onNext?: () => void
  previousAriaLabel?: string
  nextAriaLabel?: string
  trailing?: ReactNode
}

const navButtonClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wf-surface text-wf-accent shadow-[var(--shadow-card)] transition-transform active:scale-95'

export function CalendarViewHeader({
  title,
  referenceDate,
  onJumpToDate,
  weekStartsOn,
  onPrevious,
  onNext,
  previousAriaLabel = 'Previous',
  nextAriaLabel = 'Next',
  trailing,
}: CalendarViewHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      {onPrevious ? (
        <button type="button" onClick={onPrevious} className={navButtonClass} aria-label={previousAriaLabel}>
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
      ) : (
        <div className="w-9 shrink-0" aria-hidden />
      )}

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <ViewDateTitle
          title={title}
          referenceDate={referenceDate}
          onJumpToDate={onJumpToDate}
          weekStartsOn={weekStartsOn}
        />
        {trailing}
      </div>

      {onNext ? (
        <button type="button" onClick={onNext} className={navButtonClass} aria-label={nextAriaLabel}>
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      ) : (
        <div className="w-9 shrink-0" aria-hidden />
      )}
    </div>
  )
}
