import type { CalendarItem } from '../types'
import { formatTime, getItemsForDate, getWeekDays } from '../dateUtils'
interface WeekTimelineViewProps {
  weekStart: Date
  items: CalendarItem[]
  onItemTap?: (item: CalendarItem) => void
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)

export function WeekTimelineView({
  weekStart,
  items,
  onItemTap,
}: WeekTimelineViewProps) {
  const days = getWeekDays(weekStart)

  return (
    <div className="overflow-x-auto px-2 pb-6">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px rounded-2xl bg-wf-border overflow-hidden shadow-[var(--shadow-card)]">
          <div className="bg-wf-bg" />
          {days.map((day) => (
            <div key={day.toISOString()} className="bg-wf-surface px-2 py-2 text-center">
              <p className="text-[11px] font-medium text-wf-text-secondary">
                {day.toLocaleDateString('en-GB', { weekday: 'short' })}
              </p>
              <p className="font-display text-[16px] font-semibold">{day.getDate()}</p>
            </div>
          ))}

          {HOURS.map((hour) => (
            <TimelineRow
              key={hour}
              hour={hour}
              days={days}
              items={items}
              onItemTap={onItemTap}
            />
          ))}
        </div>

        <p className="mt-3 px-2 text-center text-[12px] text-wf-text-tertiary">
          Standard week timeline — only shows timed events
        </p>
      </div>
    </div>
  )
}

function TimelineRow({
  hour,
  days,
  items,
  onItemTap,
}: {
  hour: number
  days: Date[]
  items: CalendarItem[]
  onItemTap?: (item: CalendarItem) => void
}) {
  const label = `${hour % 12 || 12}${hour >= 12 ? 'pm' : 'am'}`

  return (
    <>
      <div className="flex items-start justify-end bg-wf-bg pr-2 pt-2">
        <span className="text-[11px] text-wf-text-tertiary">{label}</span>
      </div>
      {days.map((day) => {
        const dayItems = getItemsForDate(items, day).filter((i) => {
          if (i.allDay || !i.startTime) return false
          const h = parseInt(i.startTime.split(':')[0], 10)
          return h === hour
        })

        return (
          <div key={day.toISOString()} className="min-h-[52px] bg-wf-surface p-1">
            {dayItems.map((item) => (
              <div
                key={item.id}
                className="mb-1 rounded-lg px-2 py-1 text-[12px] font-medium text-white"
                style={{ backgroundColor: item.colour }}
              >
                <button type="button" className="w-full text-left" onClick={() => onItemTap?.(item)}>
                  {formatTime(item.startTime!)} {item.title}
                </button>
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}
