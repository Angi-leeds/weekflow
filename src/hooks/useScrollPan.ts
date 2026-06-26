import { useEffect, useRef, useState, type RefObject } from 'react'

export type ScrollPanAxis = 'vertical' | 'horizontal'

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, option, [role="button"], [role="switch"], [contenteditable="true"], label, [data-no-scroll-pan]'

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(INTERACTIVE_SELECTOR))
}

export interface UseScrollPanOptions {
  axis: ScrollPanAxis
  enabled?: boolean
  onPanEnd?: () => void
}

export function useScrollPan<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { axis, enabled = true, onPanEnd }: UseScrollPanOptions,
) {
  const [isDragging, setIsDragging] = useState(false)
  const onPanEndRef = useRef(onPanEnd)
  onPanEndRef.current = onPanEnd
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    scrollLeft: number
    scrollTop: number
    dragging: boolean
  } | null>(null)

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    const threshold = 4

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (isInteractiveTarget(event.target)) return

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        dragging: false,
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const state = dragRef.current
      if (!state || event.pointerId !== state.pointerId) return

      const deltaX = event.clientX - state.startX
      const deltaY = event.clientY - state.startY

      if (!state.dragging) {
        if (Math.hypot(deltaX, deltaY) < threshold) return

        const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY)
        if (axis === 'horizontal' && !horizontalIntent) {
          dragRef.current = null
          return
        }
        if (axis === 'vertical' && horizontalIntent) {
          dragRef.current = null
          return
        }

        state.dragging = true
        setIsDragging(true)
        el.setPointerCapture(event.pointerId)
      }

      event.preventDefault()

      if (axis === 'horizontal') {
        el.scrollLeft = state.scrollLeft - deltaX
      } else {
        el.scrollTop = state.scrollTop - deltaY
      }
    }

    const finish = (event: PointerEvent) => {
      const state = dragRef.current
      if (!state || event.pointerId !== state.pointerId) return

      if (state.dragging) {
        if (el.hasPointerCapture(event.pointerId)) {
          el.releasePointerCapture(event.pointerId)
        }
        const suppressClick = (clickEvent: MouseEvent) => {
          clickEvent.preventDefault()
          clickEvent.stopImmediatePropagation()
          el.removeEventListener('click', suppressClick, true)
        }
        el.addEventListener('click', suppressClick, true)
        onPanEndRef.current?.()
      }

      dragRef.current = null
      setIsDragging(false)
    }

    const onWheel = (event: WheelEvent) => {
      if (axis !== 'horizontal') return
      if ((event.target as Element).closest('[data-wheel-chain]')) return
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      if (el.scrollWidth <= el.clientWidth) return
      event.preventDefault()
      el.scrollLeft += event.deltaY
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', finish)
    el.addEventListener('pointercancel', finish)
    if (axis === 'horizontal') {
      el.addEventListener('wheel', onWheel, { passive: false })
    }

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', finish)
      el.removeEventListener('pointercancel', finish)
      if (axis === 'horizontal') {
        el.removeEventListener('wheel', onWheel)
      }
    }
  }, [axis, enabled, ref])

  return {
    isDragging,
    cursorClassName: isDragging ? 'cursor-grabbing select-none' : 'cursor-grab',
  }
}

/** Map vertical wheel to horizontal parent scroll when a child panel hits its scroll edge. */
export function useHorizontalWheelChain(
  parentRef: RefObject<HTMLElement | null>,
  childSelector: string,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return

    const children = parent.querySelectorAll<HTMLElement>(childSelector)

    const onWheel = (event: WheelEvent) => {
      const section = event.currentTarget as HTMLElement
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        event.preventDefault()
        parent.scrollLeft += event.deltaX
        return
      }

      const canScrollVertically = section.scrollHeight > section.clientHeight + 1
      if (!canScrollVertically) {
        event.preventDefault()
        parent.scrollLeft += event.deltaY
        return
      }

      const atTop = section.scrollTop <= 0
      const atBottom =
        section.scrollTop + section.clientHeight >= section.scrollHeight - 1

      if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
        event.preventDefault()
        parent.scrollLeft += event.deltaY
      }
    }

    children.forEach((child) => child.addEventListener('wheel', onWheel, { passive: false }))
    return () => {
      children.forEach((child) => child.removeEventListener('wheel', onWheel))
    }
  }, [childSelector, parentRef, ...deps])
}
