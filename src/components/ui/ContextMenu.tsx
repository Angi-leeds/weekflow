import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface ContextMenuItem {
  id: string
  label: string
  disabled?: boolean
  destructive?: boolean
  onSelect: () => void
}

interface ContextMenuProps {
  open: boolean
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ open, x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const padding = 8
    let left = x
    let top = y
    if (left + rect.width > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - rect.width - padding)
    }
    if (top + rect.height > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - rect.height - padding)
    }
    setPosition({ left, top })
  }, [open, x, y, items.length])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} aria-hidden />
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-[101] min-w-[180px] overflow-hidden rounded-xl border border-wf-border bg-wf-surface py-1 shadow-[var(--shadow-card-hover)]"
        style={{ left: position.left, top: position.top }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              onClose()
              item.onSelect()
            }}
            className={`flex w-full px-3 py-2 text-left text-subhead transition-colors ${
              item.disabled
                ? 'cursor-not-allowed text-wf-text-tertiary/60'
                : item.destructive
                  ? 'text-wf-red hover:bg-wf-red/10'
                  : 'text-wf-text hover:bg-wf-bg'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}
