import type { SpanPosition } from '../dateUtils'
import {
  formatDateRangeShort,
  formatTime,
  formatTimeRange,
  getItemEndDate,
  isMultiDay,
} from '../dateUtils'
import type { CalendarItem, Category, ItemDisplayOptions } from '../types'
import { DEFAULT_ITEM_DISPLAY } from '../types'
import { getCategoryName } from '../categories'
import { isTaskOrReminder } from './itemHelpers'
import { Badge } from './ui/Badge'

interface CalendarItemRowProps {
  item: CalendarItem
  categories: Category[]
  spanPosition?: SpanPosition
  compact?: boolean
  hideCategoryBadge?: boolean
  displayOptions?: ItemDisplayOptions
  onTap?: (item: CalendarItem) => void
  onToggleComplete?: (id: string) => void
  viewDate?: Date
}

export function CalendarItemRow({
  item,
  categories,
  spanPosition = 'single',
  compact = false,
  hideCategoryBadge = false,
  displayOptions = DEFAULT_ITEM_DISPLAY,
  onTap,
  onToggleComplete,
  viewDate,
}: CalendarItemRowProps) {
  const isTask = isTaskOrReminder(item, categories)
  const completed = item.completed ?? false
  const density = displayOptions.density === 'comfortable' && !compact ? 'comfortable' : displayOptions.density
  const isMinimalDensity = density === 'minimal'
  const isCompactDensity = density === 'compact' || isMinimalDensity || compact
  const showNotes =
    displayOptions.showNotesPreview &&
    item.notes &&
    (spanPosition === 'start' || spanPosition === 'single')
  const showBadge =
    displayOptions.showCategoryBadge && !hideCategoryBadge && displayOptions.colorStyle !== 'filled'
  const showTimeAbove = displayOptions.timePlacement === 'above-title'
  const showTimeInline = displayOptions.timePlacement === 'inline-title'
  const hideTime = displayOptions.timePlacement === 'hidden'

  const titleClass =
    displayOptions.titleSize === 'lg'
      ? isCompactDensity
        ? 'text-body'
        : 'text-[17px]'
      : displayOptions.titleSize === 'sm'
        ? 'text-[12px]'
        : isCompactDensity
          ? 'text-[13px]'
          : 'text-body'

  const paddingClass = isMinimalDensity
    ? 'py-1.5 pr-2 pl-2'
    : isCompactDensity
      ? 'py-2 pr-2 pl-2.5'
      : 'py-2.5 pr-3 pl-2.5'

  const cardStyle = buildCardStyle(item.colour, displayOptions.colorStyle)
  const cardBorderClass = displayOptions.cardBorder
    ? displayOptions.colorStyle === 'filled'
      ? 'ring-1 ring-white/35'
      : displayOptions.colorStyle === 'left-border'
        ? ''
        : 'ring-1 ring-wf-border/70'
    : ''
  const timeLabel = hideTime ? null : (
    <TimeLabel
      item={item}
      spanPosition={spanPosition}
      isTask={isTask}
      compact={isCompactDensity}
      viewDate={viewDate}
      showAnytimeLabel={displayOptions.showTaskAnytimeLabel}
    />
  )

  return (
    <button
      type="button"
      onClick={() => onTap?.(item)}
      className={`group flex w-full gap-0 overflow-hidden text-left transition-all hover:bg-black/[0.02] active:scale-[0.99] active:bg-black/[0.04] ${
        completed ? 'opacity-55' : ''
      } ${isCompactDensity ? 'my-1' : 'my-1.5'} ${cardStyle.outerClass} ${cardBorderClass} ${displayOptions.cardShadow ? 'shadow-[var(--shadow-card)]' : ''}`}
      style={cardStyle.outerStyle}
    >
      {displayOptions.colorStyle === 'accent-bar' && (
        <span
          className="w-1 shrink-0 self-stretch rounded-full"
          style={{ backgroundColor: item.colour }}
          aria-hidden
        />
      )}

      {displayOptions.colorStyle === 'left-border' && (
        <span
          className="w-1 shrink-0 self-stretch"
          style={{ backgroundColor: item.colour }}
          aria-hidden
        />
      )}

      <span className={`min-w-0 flex-1 ${paddingClass}`}>
        {showTimeAbove && timeLabel && (
          <span className="mb-0.5 flex items-center justify-between gap-2">
            {timeLabel}
            {!isCompactDensity && showBadge && (
              <Badge label={getCategoryName(categories, item.categoryId)} colour={item.colour} variant="default" />
            )}
          </span>
        )}

        {!showTimeAbove && !isCompactDensity && showBadge && (
          <span className="mb-0.5 flex justify-end">
            <Badge label={getCategoryName(categories, item.categoryId)} colour={item.colour} variant="default" />
          </span>
        )}

        <span className="flex items-start gap-2">
          {displayOptions.colorStyle === 'dot-only' && (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.colour }}
              aria-hidden
            />
          )}

          {isTask && (
            <span
              role="checkbox"
              aria-checked={completed}
              onClick={(e) => {
                e.stopPropagation()
                onToggleComplete?.(item.id)
              }}
              className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                completed
                  ? 'border-wf-green bg-wf-green text-white scale-100'
                  : 'border-wf-text-tertiary group-hover:border-wf-accent'
              }`}
            >
              {completed && (
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span className={`flex items-baseline gap-2 ${showTimeInline ? 'flex-wrap' : ''}`}>
              {showTimeInline && timeLabel}
              <span
                className={`font-medium leading-snug ${titleClass} ${
                  displayOptions.colorStyle === 'filled' ? 'text-white' : 'text-wf-text'
                } ${completed && displayOptions.showCompletedStrike ? 'line-through decoration-wf-text-tertiary' : ''}`}
              >
                {item.title}
              </span>
            </span>
            {!isCompactDensity && showNotes && (
              <span
                className={`mt-0.5 block truncate text-subhead ${
                  displayOptions.colorStyle === 'filled' ? 'text-white/80' : 'text-wf-text-tertiary'
                }`}
              >
                {item.notes}
              </span>
            )}
            {item.onlineMeetingUrl && (
              <a
                href={item.onlineMeetingUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="mt-1 inline-block text-[11px] font-semibold text-[#464775] underline"
              >
                Join Teams
              </a>
            )}
          </span>
        </span>
      </span>
    </button>
  )
}

function buildCardStyle(
  colour: string,
  colorStyle: ItemDisplayOptions['colorStyle'],
): { outerClass: string; outerStyle?: React.CSSProperties } {
  switch (colorStyle) {
    case 'tinted':
      return {
        outerClass: 'rounded-xl',
        outerStyle: { backgroundColor: `${colour}18` },
      }
    case 'filled':
      return {
        outerClass: 'rounded-xl',
        outerStyle: { backgroundColor: colour },
      }
    case 'dot-only':
      return { outerClass: 'rounded-lg' }
    case 'left-border':
      return { outerClass: 'rounded-lg bg-wf-surface ring-1 ring-wf-border/60' }
    case 'accent-bar':
    default:
      return { outerClass: 'rounded-xl' }
  }
}

function TimeLabel({
  item,
  spanPosition,
  isTask,
  compact,
  viewDate,
  showAnytimeLabel,
}: {
  item: CalendarItem
  spanPosition: SpanPosition
  isTask: boolean
  compact: boolean
  viewDate?: Date
  showAnytimeLabel: boolean
}) {
  const sizeClass = compact ? 'text-[11px]' : 'text-subhead'

  if (isMultiDay(item) && item.allDay && !isTask) {
    return (
      <span className={`tabular-nums font-semibold text-wf-text-secondary ${sizeClass}`}>
        {formatDateRangeShort(item.date, getItemEndDate(item))}
      </span>
    )
  }

  if (item.allDay && !isTask) {
    return (
      <span className={`tabular-nums font-medium text-wf-text-secondary ${sizeClass}`}>
        All day
      </span>
    )
  }

  if (item.startTime && spanPosition === 'start' && isMultiDay(item) && !item.allDay) {
    return (
      <span className={`tabular-nums font-semibold text-wf-text-secondary ${sizeClass}`}>
        {formatTime(item.startTime)} → {formatDateRangeShort(item.date, getItemEndDate(item))}
      </span>
    )
  }

  if (item.startTime) {
    return (
      <span className={`shrink-0 tabular-nums font-semibold text-wf-text-secondary ${sizeClass}`}>
        {item.endTime
          ? formatTimeRange(item.startTime, item.endTime)
          : formatTime(item.startTime)}
      </span>
    )
  }

  if (isTask && showAnytimeLabel) {
    return (
      <span className={`shrink-0 font-medium text-wf-text-tertiary ${sizeClass}`}>
        Anytime
      </span>
    )
  }

  return null
}
