import type { WeekStartsOn } from '../types'
import { DateJumpMenu } from './DateJumpMenu'
import { DateOffsetBadge } from './DateOffsetBadge'

interface ViewDateHeaderExtrasProps {
  referenceDate: Date
  onJumpToDate?: (date: Date) => void
  weekStartsOn?: WeekStartsOn
}

export function ViewDateHeaderExtras({
  referenceDate,
  onJumpToDate,
  weekStartsOn,
}: ViewDateHeaderExtrasProps) {
  return (
    <>
      <DateOffsetBadge date={referenceDate} />
      {onJumpToDate && (
        <DateJumpMenu
          referenceDate={referenceDate}
          onJump={onJumpToDate}
          weekStartsOn={weekStartsOn}
        />
      )}
    </>
  )
}

interface ViewDateTitleProps {
  title: string
  referenceDate: Date
  onJumpToDate?: (date: Date) => void
  weekStartsOn?: WeekStartsOn
  titleClassName?: string
}

export function ViewDateTitle({
  title,
  referenceDate,
  onJumpToDate,
  weekStartsOn,
  titleClassName = 'truncate font-display text-title font-bold tracking-tight',
}: ViewDateTitleProps) {
  return (
    <div className="inline-flex max-w-full items-center justify-center gap-1.5">
      <h2 className={titleClassName}>{title}</h2>
      <ViewDateHeaderExtras
        referenceDate={referenceDate}
        onJumpToDate={onJumpToDate}
        weekStartsOn={weekStartsOn}
      />
    </div>
  )
}
