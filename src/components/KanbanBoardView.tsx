import type { BoardPin } from "../../shared/boardPins";
import type { SharedBoardItem } from "../../shared/boardPins";
import type { EntityType, ItemLink } from "../../shared/links";
import {
  getKanbanColumnForItem,
  isVoicePinContent,
  KANBAN_PEOPLE_COLUMNS,
  KANBAN_STATUS_COLUMNS,
  type KanbanGroupBy,
  type VoicePinContent,
} from "../../shared/boardLayout";
import type { CalendarItem, Category, EmailMessage } from "../types";
import { BoardPinCard } from "./BoardPinCard";
import { LinkChips } from "./LinkChips";
import { VoicePinCard } from "./VoicePinCard";

interface KanbanBoardViewProps {
  sharedItems: SharedBoardItem[];
  pins: BoardPin[];
  items: CalendarItem[];
  categories: Category[];
  links: ItemLink[];
  emails: EmailMessage[];
  groupBy: KanbanGroupBy;
  onGroupByChange: (groupBy: KanbanGroupBy) => void;
  onItemTap?: (item: SharedBoardItem) => void;
  onNavigateLink: (type: EntityType, id: string) => void;
  onPinUpdate: (pin: BoardPin) => void;
}

export function KanbanBoardView({
  sharedItems,
  pins,
  items,
  categories,
  links,
  emails,
  groupBy,
  onGroupByChange,
  onItemTap,
  onNavigateLink,
  onPinUpdate,
}: KanbanBoardViewProps) {
  const columns =
    groupBy === "people" ? [...KANBAN_PEOPLE_COLUMNS] : [...KANBAN_STATUS_COLUMNS];

  const voicePins = pins.filter((pin) => isVoicePinContent(pin.contentJson));

  const cardsByColumn = new Map<string, Array<{ type: "item"; item: SharedBoardItem; pin: BoardPin } | { type: "voice"; pin: BoardPin; content: VoicePinContent }>>();

  for (const column of columns) {
    cardsByColumn.set(column, []);
  }

  for (const item of sharedItems) {
    const pin = pins.find(
      (entry) => entry.itemType === item.itemType && entry.itemId === item.itemId,
    );
    if (!pin) continue;

    const calendarItem = items.find((entry) => entry.id === item.itemId);
    const category = categories.find((entry) => entry.id === calendarItem?.categoryId);
    const kanbanColumn =
      (pin.contentJson?.kanbanColumn as string | undefined) ??
      getKanbanColumnForItem(groupBy, {
        categoryId: calendarItem?.categoryId ?? "",
        categoryName: category?.name ?? item.subtitle ?? "",
        completed: calendarItem?.completed,
      });

    const list = cardsByColumn.get(kanbanColumn) ?? cardsByColumn.get(columns[0])!;
    list.push({ type: "item", item, pin });
    if (!cardsByColumn.has(kanbanColumn)) {
      cardsByColumn.set(kanbanColumn, list);
    }
  }

  for (const pin of voicePins) {
    const content = pin.contentJson as VoicePinContent;
    const column = (pin.contentJson?.kanbanColumn as string) ?? "Family";
    const list = cardsByColumn.get(column) ?? cardsByColumn.get(columns[0])!;
    list.push({ type: "voice", pin, content });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-wf-border px-4 py-2">
        <div>
          <h2 className="font-display text-body font-bold">Kanban board</h2>
          <p className="text-caption text-wf-text-tertiary">Grouped by {groupBy}</p>
        </div>
        <select
          value={groupBy}
          onChange={(event) => onGroupByChange(event.target.value as KanbanGroupBy)}
          className="rounded-lg border border-wf-border bg-wf-surface px-2 py-1 text-caption font-semibold"
        >
          <option value="people">People</option>
          <option value="status">Status</option>
        </select>
      </div>

      <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto p-3">
        {columns.map((column) => (
          <div
            key={column}
            className="flex w-[220px] shrink-0 flex-col rounded-xl bg-wf-bg/80"
          >
            <div className="border-b border-wf-border/60 px-3 py-2">
              <p className="text-subhead font-bold text-wf-text">{column}</p>
              <p className="text-caption text-wf-text-tertiary">
                {(cardsByColumn.get(column) ?? []).length} pins
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {(cardsByColumn.get(column) ?? []).map((entry) =>
                entry.type === "voice" ? (
                  <VoicePinCard
                    key={entry.pin.id}
                    pin={entry.pin}
                    content={entry.content}
                    pulsing={!entry.content.played}
                    compact
                    onPlay={() =>
                      onPinUpdate({
                        ...entry.pin,
                        contentJson: { ...entry.content, played: true },
                      })
                    }
                    onReply={(text) => {
                      const reply = {
                        id: crypto.randomUUID(),
                        from: "You",
                        text,
                        createdAt: new Date().toISOString(),
                      };
                      onPinUpdate({
                        ...entry.pin,
                        contentJson: {
                          ...entry.content,
                          replies: [...entry.content.replies, reply],
                        },
                      });
                    }}
                  />
                ) : (
                  <div key={entry.pin.id} className="rounded-xl bg-wf-surface p-1 shadow-sm">
                    <button type="button" onClick={() => onItemTap?.(entry.item)} className="w-full text-left">
                      <BoardPinCard item={entry.item} />
                    </button>
                    <div className="px-1 pb-1">
                      <LinkChips
                        entityType={entry.item.itemType}
                        entityId={entry.item.itemId}
                        links={links}
                        items={items}
                        emails={emails}
                        onNavigate={onNavigateLink}
                        compact
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
