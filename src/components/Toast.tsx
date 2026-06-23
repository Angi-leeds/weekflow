import { useEffect } from 'react'

interface ToastProps {
  message: string | null
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, 3500)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="pointer-events-none fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[90vw] -translate-x-1/2">
      <div className="rounded-full bg-wf-text px-4 py-2.5 text-center text-subhead font-medium text-white shadow-lg">
        {message}
      </div>
    </div>
  )
}
