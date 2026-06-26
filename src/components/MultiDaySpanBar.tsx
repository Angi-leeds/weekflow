import type { WeekSpanSegment } from '../dateUtils'
import {
  formatDateRangeShort,
  formatDayColumnHeader,
  getItemEndDate,
  getWeekDays,
  packWeekSpanSegmentsIntoLanes,
} from '../dateUtils'
import type { CalendarItem } from '../types'

interface MultiDaySpanBarProps {
  segments: WeekSpanSegment[]
  weekStart: Date
  onItemTap?: (item: CalendarItem) => void
  compact?: boolean
  showDayLabels?: boolean
  /** No gaps between columns — bar flows as one continuous strip. */
  seamless?: boolean
}

export function MultiDaySpanBar({
  segments,
  weekStart,
  onItemTap,
  compact = false,
  showDayLabels = true,
  seamless = false,
}: MultiDaySpanBarProps) {
  const days = getWeekDays(weekStart)
  const gridGap = seamless ? 'gap-0' : 'gap-1'
  const lanes = compact && seamless ? packWeekSpanSegmentsIntoLanes(segments) : segments.map((segment) => [segment])
  const rowGap = compact && seamless ? 'gap-0.5' : 'gap-1'

  if (segments.length === 0) return null

  return (
    <div className={`flex flex-col ${rowGap} ${seamless ? 'px-0' : ''}`}>
      {showDayLabels && (
        <div className={`grid grid-cols-7 ${gridGap} ${seamless ? 'px-2 pt-2' : ''}`}>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`text-center font-medium text-wf-text-tertiary ${compact ? 'text-[9px]' : 'text-[10px]'}`}
            >
              {formatDayColumnHeader(day)}
            </div>
          ))}
        </div>
      )}

      {lanes.map((lane, laneIndex) => (
        <div
          key={`lane-${laneIndex}`}
          className={`grid grid-cols-7 ${gridGap}`}
        >
          {lane.map((seg) => (
            <SpanBar
              key={seg.item.id}
              segment={seg}
              onItemTap={onItemTap}
              compact={compact}
              seamless={seamless}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function SpanBar({
  segment,
  onItemTap,
  compact,
  seamless,
}: {
  segment: WeekSpanSegment
  onItemTap?: (item: CalendarItem) => void
  compact?: boolean
  seamless?: boolean
}) {
  const { item, startCol, spanCols, continuesBefore, continuesAfter } = segment
  const range = formatDateRangeShort(item.date, getItemEndDate(item))

  const radius = seamless ? 4 : 8
  const borderRadius = `${continuesBefore ? 0 : radius}px ${continuesAfter ? 0 : radius}px ${continuesAfter ? 0 : radius}px ${continuesBefore ? 0 : radius}px`

  return (
    <button
      type="button"
      onClick={() => onItemTap?.(item)}
      className={`relative z-10 flex items-center overflow-hidden text-left transition-opacity hover:opacity-90 active:scale-[0.995] ${
        compact
          ? seamless
            ? 'h-[18px] px-1.5 text-[10px] leading-none'
            : 'h-7 px-2 text-[11px]'
          : 'h-8 px-2.5 text-caption'
      } ${seamless ? 'mx-0' : ''}`}
      style={{
        gridColumn: `${startCol + 1} / span ${spanCols}`,
        backgroundColor: seamless ? `${item.colour}35` : `${item.colour}28`,
        borderLeft: continuesBefore ? 'none' : `3px solid ${item.colour}`,
        borderRadius,
      }}
    >
      <span className="truncate font-semibold" style={{ color: item.colour }}>
        {continuesBefore && <span className="mr-0.5 opacity-60">←</span>}
        {!continuesBefore && seamless && (
          <span
            className="mr-1 inline-block h-2.5 w-0.5 shrink-0 rounded-full align-middle"
            style={{ backgroundColor: item.colour }}
          />
        )}
        {item.title}
        {!compact && <span className="ml-1.5 font-normal opacity-70">{range}</span>}
        {continuesAfter && <span className="ml-0.5 opacity-60">→</span>}
      </span>
    </button>
  )
}
