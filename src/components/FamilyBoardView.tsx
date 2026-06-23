import { useCallback, useRef, useState } from 'react'
import { Lock, Maximize2 } from 'lucide-react'
import type { BoardPin } from '../../shared/boardPins'
import type { SharedBoardItem } from '../../shared/boardPins'
import { updateBoardPinPosition } from '../lib/boardPins'

interface FamilyBoardViewProps {
  sharedItems: SharedBoardItem[]
  pins: BoardPin[]
  onPinsChange: (pins: BoardPin[]) => void
  onItemTap?: (item: SharedBoardItem) => void
  kiosk?: boolean
  onEnterKiosk?: () => void
  onExitKiosk?: () => void
}

interface PinEntry {
  item: SharedBoardItem
  pin: BoardPin
}

export function FamilyBoardView({
  sharedItems,
  pins,
  onPinsChange,
  onItemTap,
  kiosk = false,
  onEnterKiosk,
  onExitKiosk,
}: FamilyBoardViewProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  const pinEntries = sharedItems
    .map((item) => {
      const pin = pins.find(
        (entry) => entry.itemType === item.itemType && entry.itemId === item.itemId,
      )
      return pin ? { item, pin } : null
    })
    .filter((entry): entry is PinEntry => entry !== null)

  const handlePointerDown = useCallback(
    (entry: PinEntry, event: React.PointerEvent) => {
      if (!boardRef.current) return
      event.preventDefault()
      const rect = boardRef.current.getBoundingClientRect()
      dragOffset.current = {
        x: event.clientX - rect.left - (entry.pin.x / 100) * rect.width,
        y: event.clientY - rect.top - (entry.pin.y / 100) * rect.height,
      }
      setDraggingId(entry.pin.id)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!draggingId || !boardRef.current) return
      const rect = boardRef.current.getBoundingClientRect()
      const x = ((event.clientX - rect.left - dragOffset.current.x) / rect.width) * 100
      const y = ((event.clientY - rect.top - dragOffset.current.y) / rect.height) * 100

      onPinsChange(
        pins.map((pin) =>
          pin.id === draggingId
            ? {
                ...pin,
                x: Math.min(92, Math.max(2, x)),
                y: Math.min(88, Math.max(4, y)),
              }
            : pin,
        ),
      )
    },
    [draggingId, pins, onPinsChange],
  )

  const handlePointerUp = useCallback(
    async (event: React.PointerEvent) => {
      if (!draggingId) return
      const pin = pins.find((entry) => entry.id === draggingId)
      setDraggingId(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      if (!pin) return

      try {
        const updated = await updateBoardPinPosition(pin.id, {
          x: pin.x,
          y: pin.y,
          rotation: pin.rotation,
        })
        onPinsChange(pins.map((entry) => (entry.id === updated.id ? updated : entry)))
      } catch (error) {
        console.error(error)
      }
    },
    [draggingId, pins, onPinsChange],
  )

  return (
    <div className={`flex min-h-0 flex-col ${kiosk ? 'h-full' : 'h-full'}`}>
      {!kiosk && (
        <div className="flex shrink-0 items-center justify-between border-b border-wf-border px-4 py-2">
          <div>
            <h2 className="font-display text-body font-bold">Family board</h2>
            <p className="text-caption text-wf-text-tertiary">
              {sharedItems.length} shared · drag pins to rearrange
            </p>
          </div>
          {onEnterKiosk && (
            <button
              type="button"
              onClick={onEnterKiosk}
              className="flex items-center gap-1.5 rounded-full bg-wf-surface px-3 py-1.5 text-caption font-semibold text-wf-text-secondary shadow-[var(--shadow-card)]"
            >
              <Maximize2 size={14} />
              Kiosk
            </button>
          )}
        </div>
      )}

      {kiosk && onExitKiosk && (
        <button
          type="button"
          onClick={onExitKiosk}
          className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-caption font-semibold text-white backdrop-blur-sm safe-top"
        >
          <Lock size={14} />
          Exit kiosk
        </button>
      )}

      <div
        ref={boardRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-[#c4a574] shadow-inner"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(0,0,0,0.06) 0%, transparent 40%),
            repeating-linear-gradient(
              45deg,
              rgba(0,0,0,0.03) 0px,
              rgba(0,0,0,0.03) 2px,
              transparent 2px,
              transparent 6px
            )
          `,
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {pinEntries.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="max-w-xs text-subhead font-medium text-[#5c4a32]">
              Share calendar events, tasks, or emails to the family board from their detail view.
            </p>
          </div>
        )}

        {pinEntries.map(({ item, pin }) => (
          <div
            key={pin.id}
            className="absolute touch-none select-none"
            style={{
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              transform: `translate(-50%, -50%) rotate(${pin.rotation}deg)`,
              zIndex: draggingId === pin.id ? 30 : 10,
            }}
            onPointerDown={(event) => handlePointerDown({ item, pin }, event)}
          >
            <div className="mb-1 flex justify-center">
              <span className="text-lg leading-none drop-shadow-sm" aria-hidden>
                📌
              </span>
            </div>
            <button
              type="button"
              onClick={() => onItemTap?.(item)}
              className={`block max-w-[160px] text-left transition-transform active:scale-[0.98] ${
                draggingId === pin.id ? 'scale-105 shadow-lg' : 'shadow-md'
              }`}
            >
              <BoardPinCard item={item} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function BoardPinCard({ item }: { item: SharedBoardItem }) {
  const display = item.boardDisplay

  if (display === 'invite_card') {
    return (
      <div
        className="overflow-hidden rounded-xl border-2 border-white/40 text-white"
        style={{ background: `linear-gradient(145deg, ${item.colour}, ${shadeColour(item.colour, -20)})` }}
      >
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider opacity-90">
          You&apos;re invited
        </div>
        <div className="bg-white/95 px-3 py-2 text-wf-text">
          <p className="font-display text-subhead font-bold leading-tight">{item.title}</p>
          {item.dateLabel && (
            <p className="mt-1 text-caption text-wf-text-secondary">{item.dateLabel}</p>
          )}
        </div>
      </div>
    )
  }

  if (display === 'title_photo') {
    return (
      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        <div
          className="h-16 bg-gradient-to-br from-wf-accent/30 to-wf-accent/60"
          style={{ background: `linear-gradient(135deg, ${item.colour}44, ${item.colour}99)` }}
        />
        <div className="px-2.5 py-2">
          <p className="line-clamp-2 text-caption font-bold leading-tight text-wf-text">
            {item.title}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white px-2.5 py-2 shadow-md">
      <p className="line-clamp-2 text-caption font-bold leading-tight text-wf-text">
        {item.title}
      </p>
      {(display === 'title_date' || item.dateLabel) && item.dateLabel && (
        <p className="mt-1 text-[11px] font-medium text-wf-text-secondary">{item.dateLabel}</p>
      )}
      {item.subtitle && display === 'title_only' && (
        <p className="mt-0.5 truncate text-[10px] text-wf-text-tertiary">{item.subtitle}</p>
      )}
    </div>
  )
}

function shadeColour(hex: string, amount: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const num = parseInt(normalized, 16)
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
