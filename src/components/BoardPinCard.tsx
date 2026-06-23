import type { SharedBoardItem } from "../../shared/boardPins";
import type { BoardDisplay } from "../../shared/itemShares";

export function BoardPinCard({ item }: { item: SharedBoardItem }) {
  const display = item.boardDisplay;

  if (display === "invite_card") {
    return (
      <div
        className="overflow-hidden rounded-xl border-2 border-white/40 text-white"
        style={{ background: `linear-gradient(145deg, ${item.colour}, ${shadeColour(item.colour, -20)})` }}
      >
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider opacity-90">
          You&apos;re invited
        </div>
        <div className="bg-white/95 px-3 py-2 text-wf-text">
          {item.photoUrl && (
            <img src={item.photoUrl} alt="" className="mb-2 h-12 w-full rounded-md object-cover" />
          )}
          <p className="font-display text-subhead font-bold leading-tight">{item.title}</p>
          {item.dateLabel && (
            <p className="mt-1 text-caption text-wf-text-secondary">{item.dateLabel}</p>
          )}
        </div>
      </div>
    );
  }

  if (display === "title_photo") {
    return (
      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        {item.photoUrl ? (
          <img src={item.photoUrl} alt="" className="h-16 w-full object-cover" />
        ) : (
          <div
            className="h-16"
            style={{ background: `linear-gradient(135deg, ${item.colour}44, ${item.colour}99)` }}
          />
        )}
        <div className="px-2.5 py-2">
          <p className="line-clamp-2 text-caption font-bold leading-tight text-wf-text">
            {item.title}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white px-2.5 py-2 shadow-md">
      <p className="line-clamp-2 text-caption font-bold leading-tight text-wf-text">
        {item.title}
      </p>
      {(display === "title_date" || item.dateLabel) && item.dateLabel && (
        <p className="mt-1 text-[11px] font-medium text-wf-text-secondary">{item.dateLabel}</p>
      )}
      {item.subtitle && display === "title_only" && (
        <p className="mt-0.5 truncate text-[10px] text-wf-text-tertiary">{item.subtitle}</p>
      )}
    </div>
  );
}

function shadeColour(hex: string, amount: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const num = parseInt(normalized, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export type { BoardDisplay };
