import { Moon, Plus } from "lucide-react";
import type { BoardLayoutMode } from "../../shared/boardLayout";
import { BOARD_LAYOUT_LABELS, PIN_STYLE_EMOJIS } from "../../shared/boardLayout";

interface BoardLayoutToolbarProps {
  layout: BoardLayoutMode;
  sleepModeEnabled: boolean;
  selectedPinStyle?: string | null;
  onLayoutChange: (layout: BoardLayoutMode) => void;
  onSleepModeToggle: (enabled: boolean) => void;
  onPinStyleChange?: (emoji: string) => void;
  onAddVoicePin?: () => void;
}

export function BoardLayoutToolbar({
  layout,
  sleepModeEnabled,
  selectedPinStyle,
  onLayoutChange,
  onSleepModeToggle,
  onPinStyleChange,
  onAddVoicePin,
}: BoardLayoutToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-wf-border px-4 py-2">
      <div className="flex rounded-lg bg-wf-bg p-0.5">
        {(Object.keys(BOARD_LAYOUT_LABELS) as BoardLayoutMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onLayoutChange(mode)}
            className={`rounded-md px-2.5 py-1 text-caption font-semibold transition-colors ${
              layout === mode
                ? "bg-wf-surface text-wf-accent shadow-sm"
                : "text-wf-text-secondary"
            }`}
          >
            {BOARD_LAYOUT_LABELS[mode]}
          </button>
        ))}
      </div>

      {onPinStyleChange && (
        <div className="flex items-center gap-1">
          {PIN_STYLE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onPinStyleChange(emoji)}
              className={`rounded-md px-1.5 py-0.5 text-base ${
                selectedPinStyle === emoji ? "bg-wf-accent-soft ring-1 ring-wf-accent" : ""
              }`}
              aria-label={`Pin style ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-caption font-medium text-wf-text-secondary">
          <Moon size={14} />
          Sleep
          <input
            type="checkbox"
            checked={sleepModeEnabled}
            onChange={(event) => onSleepModeToggle(event.target.checked)}
            className="h-4 w-4 accent-wf-accent"
          />
        </label>
        {onAddVoicePin && (
          <button
            type="button"
            onClick={onAddVoicePin}
            className="inline-flex items-center gap-1 rounded-full bg-wf-accent-soft px-3 py-1 text-caption font-semibold text-wf-accent"
          >
            <Plus size={14} />
            Voice note
          </button>
        )}
      </div>
    </div>
  );
}
