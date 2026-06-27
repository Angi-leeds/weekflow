/** Minimum time between automatic focus/resume syncs (5 minutes). */
export const FOCUS_SYNC_STALE_MS = 5 * 60 * 1000

export function shouldSyncOnFocus(
  lastSyncAt: number | null,
  staleMs = FOCUS_SYNC_STALE_MS,
): boolean {
  if (lastSyncAt == null) return true
  return Date.now() - lastSyncAt >= staleMs
}

export function formatLastSynced(lastSyncAt: number | null): string | null {
  if (lastSyncAt == null) return null
  const elapsedMs = Date.now() - lastSyncAt
  if (elapsedMs < 60_000) return 'just now'
  const minutes = Math.floor(elapsedMs / 60_000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return 'over a day ago'
}
