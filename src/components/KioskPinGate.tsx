import { useState } from 'react'
import { X } from 'lucide-react'

const KIOSK_PIN_KEY = 'weekflow-kiosk-pin'

export function loadKioskPin(): string {
  return localStorage.getItem(KIOSK_PIN_KEY) ?? '1234'
}

export function saveKioskPin(pin: string): void {
  localStorage.setItem(KIOSK_PIN_KEY, pin)
}

interface KioskPinGateProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function KioskPinGate({ open, onClose, onSuccess }: KioskPinGateProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  if (!open) return null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (pin === loadKioskPin()) {
      setPin('')
      setError(false)
      onSuccess()
      return
    }
    setError(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-wf-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-body font-bold">Enter PIN to exit kiosk</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-wf-text-tertiary hover:bg-wf-bg"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
              setError(false)
            }}
            placeholder="4-digit PIN"
            className="w-full rounded-xl border border-wf-border bg-wf-bg px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-wf-accent"
            autoFocus
          />
          {error && (
            <p className="text-center text-caption font-medium text-wf-red">Incorrect PIN</p>
          )}
          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full rounded-xl bg-wf-accent py-3 text-body font-semibold text-white disabled:opacity-50"
          >
            Unlock
          </button>
        </form>

        <p className="mt-3 text-center text-caption text-wf-text-tertiary">
          Default PIN: 1234 (change in Settings)
        </p>
      </div>
    </div>
  )
}
