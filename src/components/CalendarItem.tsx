import type { SpanPosition } from '../dateUtils'
import {
  formatDateRangeShort,
  formatTime,
  formatTimeRange,
  getItemEndDate,
  isMultiDay,
} from '../dateUtils'
import type { CalendarItem, Category, ItemDisplayOptions } from '../types'
import { DEFAULT_ITEM_DISPLAY, getItemTitleSizeClass, getItemTimeSizeClass } from '../types'
import { getCategoryName } from '../categories'
import { isTaskOrReminder } from './itemHelpers'
import { Badge } from './ui/Badge'
import { useOptionalCalendarMenu } from '../context/CalendarMenuContext'
import { useCalendarLinks } from '../context/CalendarLinksContext'
import { useItemContextMenu } from '../hooks/useCalendarContextMenu'
import { formatReminderLabel, hasActiveReminder } from '../lib/reminderHelpers'
import { getItemLinkType, getLinkedPartnerItem, linkTargetIcon } from '../lib/itemLinkHelpers'
import { isEffectivelyAllDay } from '../lib/itemTimeHelpers'

interface CalendarItemRowProps {
  item: CalendarItem
  categories: Category[]
  spanPosition?: SpanPosition
  compact?: boolean
  dense?: boolean
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
  dense = false,
  hideCategoryBadge = false,
  displayOptions = DEFAULT_ITEM_DISPLAY,
  onTap,
  onToggleComplete,
  viewDate,
}: CalendarItemRowProps) {
  const isTask = isTaskOrReminder(item, categories)
  const completed = item.completed ?? false
  const density = displayOptions.density === 'comfortable' && !compact && !dense ? 'comfortable' : displayOptions.density
  const isMinimalDensity = density === 'minimal' || dense
  const isCompactDensity = density === 'compact' || isMinimalDensity || compact || dense
  const showNotes =
    displayOptions.showNotesPreview &&
    !dense &&
    item.notes &&
    (spanPosition === 'start' || spanPosition === 'single')
  const showBadge =
    !dense &&
    displayOptions.showCategoryBadge &&
    !hideCategoryBadge &&
    displayOptions.colorStyle !== 'filled'
  const showTimeAbove = !dense && displayOptions.timePlacement === 'above-title'
  const showTimeInline = dense || displayOptions.timePlacement === 'inline-title'
  const hideTime = displayOptions.timePlacement === 'hidden'

  const titleClass = getItemTitleSizeClass(displayOptions.titleSize)
  const timeSizeClass = getItemTimeSizeClass(displayOptions.titleSize)

  const paddingClass = dense
    ? 'py-0.5 pr-1.5 pl-1.5'
    : isMinimalDensity
      ? 'py-1.5 pr-2 pl-2'
      : isCompactDensity
        ? 'py-2 pr-2 pl-2.5'
        : 'py-2.5 pr-3 pl-2.5'

  const marginClass = dense ? 'my-0.5' : isCompactDensity ? 'my-1' : 'my-1.5'
  const titleLeading = dense ? 'leading-tight' : 'leading-snug'

  const cardStyle = buildCardStyle(item.colour, displayOptions.colorStyle, dense)
  const cardBorderClass =
    !dense && displayOptions.cardBorder
      ? displayOptions.colorStyle === 'filled'
        ? 'ring-1 ring-white/35'
        : displayOptions.colorStyle === 'left-border'
          ? ''
          : 'ring-1 ring-wf-border/70'
      : ''
  const cardShadowClass = !dense && displayOptions.cardShadow ? 'shadow-[var(--shadow-card)]' : ''
  const timeLabel = hideTime ? null : (
    <TimeLabel
      item={item}
      categories={categories}
      spanPosition={spanPosition}
      isTask={isTask}
      compact={isCompactDensity}
      dense={dense}
      timeSizeClass={timeSizeClass}
      viewDate={viewDate}
      showAnytimeLabel={displayOptions.showTaskAnytimeLabel}
    />
  )

  const menu = useOptionalCalendarMenu()
  const itemMenu = useItemContextMenu(item, viewDate)
  const linkContext = useCalendarLinks()
  const entityType = getItemLinkType(item, categories)
  const linkedPartner =
    linkContext &&
    getLinkedPartnerItem(linkContext.links, entityType, item.id, linkContext.items)
  const isCopied = menu?.clipboardItemId === item.id
  const denseChipText = dense ? formatDenseChipText(item, isTask, categories) : null
  const reminderLabel = !dense && hasActiveReminder(item) ? formatReminderLabel(item) : null

  return (
    <button
      type="button"
      onClick={() => onTap?.(item)}
      {...itemMenu}
      className={`group flex w-full gap-0 overflow-hidden text-left transition-all hover:bg-black/[0.02] active:scale-[0.99] active:bg-black/[0.04] ${
        completed ? 'opacity-55' : ''
      } ${isCopied ? 'ring-2 ring-wf-accent/35 ring-inset' : ''} ${marginClass} ${cardStyle.outerClass} ${cardBorderClass} ${cardShadowClass}`}
      style={cardStyle.outerStyle}
    >
      {displayOptions.colorStyle === 'accent-bar' && (
        <span
          className={`${dense ? 'w-0.5' : 'w-1'} shrink-0 self-stretch rounded-full`}
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
        {dense ? (
          <span className="flex min-w-0 items-start gap-1.5">
            {isTask && (
              <span
                role="checkbox"
                aria-checked={completed}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleComplete?.(item.id)
                }}
                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                  completed
                    ? 'border-wf-green bg-wf-green text-white'
                    : 'border-wf-text-tertiary group-hover:border-wf-accent'
                }`}
              >
                {completed && (
                  <svg className="h-2 w-2" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            )}
            <span
              className={`min-w-0 flex-1 break-words font-medium ${titleLeading} ${titleClass} ${
                displayOptions.colorStyle === 'filled' ? 'text-white' : 'text-wf-text'
              } ${completed && displayOptions.showCompletedStrike ? 'line-through decoration-wf-text-tertiary' : ''}`}
            >
              {denseChipText}
            </span>
            {linkedPartner && linkContext?.onNavigateLink && (
              <LinkedPartnerChip
                partner={linkedPartner}
                partnerIsTask={isTaskOrReminder(linkedPartner, categories)}
                dense
                onNavigate={() =>
                  linkContext.onNavigateLink!(
                    isTaskOrReminder(linkedPartner, categories) ? 'task' : 'calendar',
                    linkedPartner.id,
                  )
                }
              />
            )}
          </span>
        ) : (
          <>
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
              className={`${dense ? 'mt-0.5' : 'mt-1.5'} h-2 w-2 shrink-0 rounded-full`}
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
              className={`${dense ? 'mt-0' : 'mt-0.5'} flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
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
            <span className={`flex items-baseline gap-x-1.5 gap-y-0 ${showTimeInline ? 'flex-wrap' : ''}`}>
              {showTimeInline && timeLabel}
              <span
                className={`min-w-0 break-words font-medium ${titleLeading} ${titleClass} ${
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
            {reminderLabel && (
              <span className="mt-0.5 block truncate text-[10px] font-medium text-wf-accent">
                {reminderLabel}
              </span>
            )}
            {linkedPartner && linkContext?.onNavigateLink && (
              <LinkedPartnerChip
                partner={linkedPartner}
                partnerIsTask={isTaskOrReminder(linkedPartner, categories)}
                onNavigate={() =>
                  linkContext.onNavigateLink!(
                    isTaskOrReminder(linkedPartner, categories) ? 'task' : 'calendar',
                    linkedPartner.id,
                  )
                }
              />
            )}
            {!dense && item.onlineMeetingUrl && (
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
          </>
        )}
      </span>
    </button>
  )
}

function LinkedPartnerChip({
  partner,
  partnerIsTask,
  dense = false,
  onNavigate,
}: {
  partner: CalendarItem
  partnerIsTask: boolean
  dense?: boolean
  onNavigate: () => void
}) {
  const icon = linkTargetIcon(partnerIsTask ? 'task' : 'calendar')
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onNavigate()
      }}
      className={`inline-flex max-w-full items-center gap-1 truncate rounded-full bg-wf-accent-soft px-2 py-0.5 font-semibold text-wf-accent ${
        dense ? 'mt-0.5 text-[10px]' : 'mt-1 text-[11px]'
      }`}
      title={partner.title}
    >
      <span aria-hidden>{icon}</span>
      <span className="truncate">{partner.title}</span>
    </button>
  )
}

function formatDenseChipText(item: CalendarItem, isTask: boolean, categories: Category[]): string {
  const allDay = isEffectivelyAllDay(item, categories)
  if (!allDay && item.startTime && !isTask) {
    const time = item.endTime
      ? formatTimeRange(item.startTime, item.endTime)
      : formatTime(item.startTime)
    return `${time} ${item.title}`
  }

  if (!allDay && item.startTime && isTask) {
    return `${formatTime(item.startTime)} ${item.title}`
  }

  return item.title
}

function buildCardStyle(
  colour: string,
  colorStyle: ItemDisplayOptions['colorStyle'],
  dense = false,
): { outerClass: string; outerStyle?: React.CSSProperties } {
  const radius = dense ? 'rounded-lg' : 'rounded-xl'

  switch (colorStyle) {
    case 'tinted':
      return {
        outerClass: radius,
        outerStyle: { backgroundColor: `${colour}${dense ? '20' : '18'}` },
      }
    case 'filled':
      return {
        outerClass: radius,
        outerStyle: { backgroundColor: colour },
      }
    case 'dot-only':
      return { outerClass: dense ? 'rounded-md' : 'rounded-lg' }
    case 'left-border':
      return {
        outerClass: dense
          ? 'rounded-md bg-wf-surface'
          : 'rounded-lg bg-wf-surface ring-1 ring-wf-border/60',
      }
    case 'accent-bar':
    default:
      return {
        outerClass: radius,
        outerStyle: dense ? { backgroundColor: `${colour}14` } : undefined,
      }
  }
}

function TimeLabel({
  item,
  categories,
  spanPosition,
  isTask,
  compact,
  dense = false,
  timeSizeClass,
  viewDate,
  showAnytimeLabel,
}: {
  item: CalendarItem
  categories: Category[]
  spanPosition: SpanPosition
  isTask: boolean
  compact: boolean
  dense?: boolean
  timeSizeClass?: string
  viewDate?: Date
  showAnytimeLabel: boolean
}) {
  const sizeClass =
    timeSizeClass ??
    (dense ? 'text-[10px]' : compact ? 'text-[11px]' : 'text-subhead')

  const allDay = isEffectivelyAllDay(item, categories)

  if (isMultiDay(item) && allDay && !isTask) {
    return (
      <span className={`tabular-nums font-semibold text-wf-text-secondary ${sizeClass}`}>
        {formatDateRangeShort(item.date, getItemEndDate(item))}
      </span>
    )
  }

  if (allDay && !isTask) {
    return (
      <span className={`tabular-nums font-medium text-wf-text-secondary ${sizeClass}`}>
        All day
      </span>
    )
  }

  if (item.startTime && spanPosition === 'start' && isMultiDay(item) && !allDay) {
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
