import { useCallback, useRef } from 'react'

const LONG_PRESS_MS = 500
const MOVE_THRESHOLD_PX = 10

export function useContextMenuTrigger(onOpen: (x: number, y: number) => void) {
  const timerRef = useRef<number | null>(null)
  const originRef = useRef({ x: 0, y: 0 })

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      clearTimer()
      onOpen(event.clientX, event.clientY)
    },
    [clearTimer, onOpen],
  )

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return
      originRef.current = { x: event.clientX, y: event.clientY }
      clearTimer()
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        onOpen(event.clientX, event.clientY)
      }, LONG_PRESS_MS)
    },
    [clearTimer, onOpen],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (timerRef.current == null) return
      const dx = Math.abs(event.clientX - originRef.current.x)
      const dy = Math.abs(event.clientY - originRef.current.y)
      if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) clearTimer()
    },
    [clearTimer],
  )

  const onPointerUp = useCallback(() => {
    clearTimer()
  }, [clearTimer])

  return {
    onContextMenu,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  }
}
