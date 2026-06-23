import { useEffect, useState } from "react";
import type { SharedBoardItem } from "../../shared/boardPins";

interface BoardSleepOverlayProps {
  active: boolean;
  items: SharedBoardItem[];
  intervalMs?: number;
  onDismiss: () => void;
}

export function BoardSleepOverlay({
  active,
  items,
  intervalMs = 8000,
  onDismiss,
}: BoardSleepOverlayProps) {
  const photoItems = items.filter((item) => item.photoUrl);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || photoItems.length === 0) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % photoItems.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [active, photoItems.length, intervalMs]);

  useEffect(() => {
    if (active) setIndex(0);
  }, [active]);

  if (!active || photoItems.length === 0) return null;

  const current = photoItems[index];

  return (
    <button
      type="button"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
      aria-label="Dismiss sleep mode"
    >
      <img
        src={current.photoUrl}
        alt=""
        className="h-full w-full flex-1 object-cover opacity-90"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 pb-10 pt-16 text-left safe-bottom">
        <p className="text-caption font-semibold uppercase tracking-wide text-white/70">
          Sleep mode · tap to exit
        </p>
        <h2 className="mt-1 font-display text-title font-bold">{current.title}</h2>
        {current.dateLabel && <p className="mt-1 text-subhead text-white/80">{current.dateLabel}</p>}
      </div>
    </button>
  );
}
