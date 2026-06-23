export type BoardLayoutMode = "split" | "freeform" | "kanban";

export type KanbanGroupBy = "people" | "status";

export const BOARD_LAYOUT_LABELS: Record<BoardLayoutMode, string> = {
  split: "Split",
  freeform: "Freeform",
  kanban: "Kanban",
};

export const PIN_STYLE_EMOJIS = ["📌", "⭐", "❤️", "🎉", "📎", "🔔", "🏠", "✅"] as const;

export type PinStyleEmoji = (typeof PIN_STYLE_EMOJIS)[number];

export const KANBAN_PEOPLE_COLUMNS = ["Mum", "Dad", "Family", "Done"] as const;
export const KANBAN_STATUS_COLUMNS = ["To do", "This week", "Waiting", "Done"] as const;

export interface VoicePinReply {
  id: string;
  from: string;
  text: string;
  createdAt: string;
}

export interface VoicePinContent {
  kind: "voice";
  message: string;
  from: string;
  durationSec: number;
  played: boolean;
  replies: VoicePinReply[];
}

export function isVoicePinContent(value: unknown): value is VoicePinContent {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.kind === "voice" && typeof record.message === "string";
}

export function getKanbanColumnForItem(
  groupBy: KanbanGroupBy,
  opts: {
    categoryId: string;
    categoryName: string;
    completed?: boolean;
    existingColumn?: string;
  },
): string {
  if (opts.existingColumn) return opts.existingColumn;

  if (groupBy === "status") {
    if (opts.completed) return "Done";
    if (opts.categoryId === "task" || opts.categoryName.toLowerCase().includes("task")) {
      return "To do";
    }
    return "This week";
  }

  if (opts.completed) return "Done";
  if (opts.categoryId === "work") return "Dad";
  if (opts.categoryId === "family") return "Family";
  return "Mum";
}
