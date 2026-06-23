import type { BoardDisplay, ItemShare } from '../../shared/itemShares'
import { BOARD_DISPLAY_LABELS } from '../../shared/itemShares'

interface ShareToBoardFieldsProps {
  sharedToBoard: boolean
  boardDisplay: BoardDisplay
  onSharedChange: (shared: boolean) => void
  onDisplayChange: (display: BoardDisplay) => void
  compact?: boolean
}

export function ShareToBoardFields({
  sharedToBoard,
  boardDisplay,
  onSharedChange,
  onDisplayChange,
  compact = false,
}: ShareToBoardFieldsProps) {
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3 rounded-xl bg-wf-bg px-4 py-3'}>
      {!compact && (
        <p className="text-caption font-semibold text-wf-text-secondary">Family board</p>
      )}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={sharedToBoard}
          onChange={(e) => onSharedChange(e.target.checked)}
          className="h-5 w-5 rounded accent-wf-accent"
        />
        <span className="text-[15px] font-medium">Share to family board</span>
      </label>

      {sharedToBoard && (
        <label className="block">
          <span className="mb-1.5 block text-caption font-medium text-wf-text-secondary">
            Board display
          </span>
          <select
            value={boardDisplay}
            onChange={(e) => onDisplayChange(e.target.value as BoardDisplay)}
            className="w-full rounded-xl border border-wf-border bg-wf-surface px-3 py-2.5 text-body outline-none focus:border-wf-accent"
          >
            {(Object.keys(BOARD_DISPLAY_LABELS) as BoardDisplay[]).map((value) => (
              <option key={value} value={value}>
                {BOARD_DISPLAY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

export function shareStateFromRecord(
  share: ItemShare | undefined,
): { sharedToBoard: boolean; boardDisplay: BoardDisplay } {
  return {
    sharedToBoard: share?.sharedToBoard ?? false,
    boardDisplay: share?.boardDisplay ?? 'title_only',
  }
}
