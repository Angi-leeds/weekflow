import { RefreshCw } from 'lucide-react'
import { formatLastSynced } from '../../lib/syncScheduler'

interface SyncButtonProps {
  syncing: boolean
  lastSyncedAt: number | null
  onSync: () => void
  disabled?: boolean
  className?: string
}

export function SyncButton({
  syncing,
  lastSyncedAt,
  onSync,
  disabled = false,
  className = '',
}: SyncButtonProps) {
  const lastLabel = formatLastSynced(lastSyncedAt)
  const title = syncing
    ? 'Syncing calendar and tasks…'
    : lastLabel
      ? `Sync calendar and tasks (last synced ${lastLabel})`
      : 'Sync calendar and tasks'

  return (
    <button
      type="button"
      onClick={onSync}
      disabled={disabled || syncing}
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-wf-surface p-2 text-wf-text-secondary shadow-[var(--shadow-card)] transition-transform active:scale-95 disabled:opacity-50 ${className}`}
    >
      <RefreshCw size={18} className={syncing ? 'animate-spin' : undefined} aria-hidden />
    </button>
  )
}
