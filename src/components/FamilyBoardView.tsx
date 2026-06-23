import { useCallback, useRef, useState } from 'react'
import { Lock, Maximize2 } from 'lucide-react'
import type { BoardPin } from '../../shared/boardPins'
import type { SharedBoardItem } from '../../shared/boardPins'
import type { EntityType, ItemLink } from '../../shared/links'
import { isVoicePinContent, type VoicePinContent } from '../../shared/boardLayout'
import type { CalendarItem, EmailMessage } from '../types'
import { updateBoardPinPosition } from '../lib/boardPins'
import { BoardPinCard } from './BoardPinCard'
import { LinkChips } from './LinkChips'
import { VoicePinCard } from './VoicePinCard'

interface FamilyBoardViewProps {
  sharedItems: SharedBoardItem[]
  pins: BoardPin[]
  links: ItemLink[]
  items: CalendarItem[]
  emails: EmailMessage[]
  onPinsChange: (pins: BoardPin[]) => void
  onPinUpdate: (pin: BoardPin) => void
  onItemTap?: (item: SharedBoardItem) => void
  onNavigateLink: (type: EntityType, id: string) => void
  selectedPinId?: string | null
  onSelectPin?: (pinId: string | null) => void
  kiosk?: boolean
  onEnterKiosk?: () => void
  onExitKiosk?: () => void
}

interface ItemPinEntry {
  kind: 'item'
  item: SharedBoardItem
  pin: BoardPin
}

interface VoicePinEntry {
  kind: 'voice'
  pin: BoardPin
  content: VoicePinContent
}

type PinEntry = ItemPinEntry | VoicePinEntry

export function FamilyBoardView({
  sharedItems,
  pins,
  links,
  items,
  emails,
  onPinsChange,
  onPinUpdate,
  onItemTap,
  onNavigateLink,
  selectedPinId,
  onSelectPin,
  kiosk = false,
  onEnterKiosk,
  onExitKiosk,
}: FamilyBoardViewProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  const itemPinEntries: ItemPinEntry[] = sharedItems
    .map((item) => {
      const pin = pins.find(
        (entry) => entry.itemType === item.itemType && entry.itemId === item.itemId,
      )
      return pin ? { kind: 'item' as const, item, pin } : null
    })
    .filter((entry): entry is ItemPinEntry => entry !== null)

  const voicePinEntries: VoicePinEntry[] = pins
    .filter((pin) => isVoicePinContent(pin.contentJson))
    .map((pin) => ({
      kind: 'voice' as const,
      pin,
      content: pin.contentJson as VoicePinContent,
    }))

  const pinEntries: PinEntry[] = [...itemPinEntries, ...voicePinEntries]

  const handlePointerDown = useCallback(
    (entry: PinEntry, event: React.PointerEvent) => {
      if (!boardRef.current) return
      event.preventDefault()
      onSelectPin?.(entry.pin.id)
      const rect = boardRef.current.getBoundingClientRect()
      dragOffset.current = {
        x: event.clientX - rect.left - (entry.pin.x / 100) * rect.width,
        y: event.clientY - rect.top - (entry.pin.y / 100) * rect.height,
      }
      setDraggingId(entry.pin.id)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [onSelectPin],
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
        onPinUpdate(updated)
      } catch (error) {
        console.error(error)
      }
    },
    [draggingId, pins, onPinUpdate],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!kiosk && (
        <div className="flex shrink-0 items-center justify-between border-b border-wf-border px-4 py-2">
          <div>
            <h2 className="font-display text-body font-bold">Family board</h2>
            <p className="text-caption text-wf-text-tertiary">
              {pinEntries.length} pins · drag to rearrange
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
              Share items or add a voice note to populate the board.
            </p>
          </div>
        )}

        {pinEntries.map((entry) => (
          <div
            key={entry.pin.id}
            className="absolute touch-none select-none"
            style={{
              left: `${entry.pin.x}%`,
              top: `${entry.pin.y}%`,
              transform: `translate(-50%, -50%) rotate(${entry.pin.rotation}deg)`,
              zIndex: draggingId === entry.pin.id ? 30 : selectedPinId === entry.pin.id ? 20 : 10,
            }}
            onPointerDown={(event) => handlePointerDown(entry, event)}
          >
            <div className="mb-1 flex justify-center">
              <span className="text-lg leading-none drop-shadow-sm" aria-hidden>
                {entry.pin.pinStyle ?? (entry.kind === 'voice' ? '🎙️' : '📌')}
              </span>
            </div>
            <div
              className={`max-w-[180px] text-left transition-transform ${
                draggingId === entry.pin.id ? 'scale-105' : ''
              } ${selectedPinId === entry.pin.id ? 'ring-2 ring-wf-accent/50 rounded-xl' : ''}`}
            >
              {entry.kind === 'voice' ? (
                <VoicePinCard
                  pin={entry.pin}
                  content={entry.content}
                  pulsing={!entry.content.played}
                  onPlay={() =>
                    onPinUpdate({
                      ...entry.pin,
                      contentJson: { ...entry.content, played: true },
                    })
                  }
                  onReply={(text) => {
                    onPinUpdate({
                      ...entry.pin,
                      contentJson: {
                        ...entry.content,
                        replies: [
                          ...entry.content.replies,
                          {
                            id: crypto.randomUUID(),
                            from: 'You',
                            text,
                            createdAt: new Date().toISOString(),
                          },
                        ],
                      },
                    })
                  }}
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onItemTap?.(entry.item)}
                    className={`block w-full text-left transition-transform active:scale-[0.98] ${
                      draggingId === entry.pin.id ? 'shadow-lg' : 'shadow-md'
                    }`}
                  >
                    <BoardPinCard item={entry.item} />
                  </button>
                  <div className="mt-1.5">
                    <LinkChips
                      entityType={entry.item.itemType}
                      entityId={entry.item.itemId}
                      links={links}
                      items={items}
                      emails={emails}
                      onNavigate={onNavigateLink}
                      compact
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
