import { ChevronLeft, ChevronRight, Settings, X } from 'lucide-react'

interface SettingsPanelProps {
  open: boolean
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onClose: () => void
  children: React.ReactNode
}

export function SettingsPanel({
  open,
  expanded,
  onExpandedChange,
  onClose,
  children,
}: SettingsPanelProps) {
  if (!open) return null

  return (
    <aside
      className={`relative z-20 flex h-full min-h-0 shrink-0 flex-col border-l border-wf-border bg-wf-surface shadow-[var(--shadow-modal)] transition-[width] duration-300 ease-out ${
        expanded ? 'w-[min(420px,42vw)] max-md:w-[min(420px,88vw)]' : 'w-12'
      }`}
      aria-label="Settings panel"
    >
      {expanded ? (
        <>
          <header className="flex shrink-0 items-center gap-1 border-b border-wf-border px-2 py-2 safe-top">
            <button
              type="button"
              onClick={() => onExpandedChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-wf-text-secondary transition-colors hover:bg-black/[0.04] hover:text-wf-text"
              aria-label="Collapse settings panel"
            >
              <ChevronRight size={20} strokeWidth={2} />
            </button>
            <h2 className="min-w-0 flex-1 font-display text-body font-bold text-wf-text">Settings</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-wf-text-secondary transition-colors hover:bg-black/[0.04] hover:text-wf-text"
              aria-label="Close settings"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
        </>
      ) : (
        <div className="flex h-full flex-col items-center gap-2 py-3 safe-top">
          <span className="flex h-9 w-9 items-center justify-center text-wf-accent" aria-hidden>
            <Settings size={20} strokeWidth={2} />
          </span>
          <button
            type="button"
            onClick={() => onExpandedChange(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-wf-text-secondary transition-colors hover:bg-black/[0.04] hover:text-wf-accent"
            aria-label="Expand settings panel"
            title="Expand settings"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <span
            className="mt-1 select-none text-[10px] font-semibold uppercase tracking-wide text-wf-text-tertiary [writing-mode:vertical-rl]"
          >
            Settings
          </span>
        </div>
      )}
    </aside>
  )
}
