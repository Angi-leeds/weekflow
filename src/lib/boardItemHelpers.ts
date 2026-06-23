import type { Attachment } from "../../shared/attachments";
import type { SharedBoardItem } from "../../shared/boardPins";
import type { ItemShare } from "../../shared/itemShares";
import type { CalendarItem, Category, EmailMessage } from "../types";
import { getItemLinkType } from "./itemLinkHelpers";
import { getPhotoUrlForItem } from "./attachments";

function formatItemDate(item: CalendarItem): string | undefined {
  const d = new Date(item.date);
  if (Number.isNaN(d.getTime())) return undefined;
  if (item.allDay) {
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }
  const time = item.startTime
    ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}`
    : "";
  return (
    d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + time
  );
}

export function resolveSharedBoardItems(
  shares: ItemShare[],
  items: CalendarItem[],
  emails: EmailMessage[],
  categories: Category[],
  attachments: Attachment[] = [],
): SharedBoardItem[] {
  return shares
    .filter((share) => share.sharedToBoard)
    .map((share) => {
      if (share.itemType === "email") {
        const email = emails.find((entry) => entry.id === share.itemId);
        if (!email) return null;
        return {
          itemType: share.itemType,
          itemId: share.itemId,
          title: email.subject,
          subtitle: email.from,
          colour: "#0078d4",
          boardDisplay: share.boardDisplay,
          dateLabel: new Date(email.date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }),
        } satisfies SharedBoardItem;
      }

      const item = items.find((entry) => entry.id === share.itemId);
      if (!item) return null;

      const linkType = getItemLinkType(item, categories);
      if (linkType !== share.itemType) return null;

      return {
        itemType: share.itemType,
        itemId: share.itemId,
        title: item.title,
        subtitle: categories.find((c) => c.id === item.categoryId)?.name,
        colour: item.colour,
        boardDisplay: share.boardDisplay,
        dateLabel: formatItemDate(item),
        photoUrl:
          getPhotoUrlForItem(attachments, share.itemType, share.itemId) ?? item.photoUrl,
      } satisfies SharedBoardItem;
    })
    .filter((entry): entry is SharedBoardItem => entry !== null);
}
