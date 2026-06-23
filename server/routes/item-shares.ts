import type { Express } from "express";
import type { ShareEntityType, UpsertItemShareInput } from "../../shared/itemShares";
import {
  getItemShareForEntity,
  listItemShares,
  upsertItemShare,
} from "../services/item-share-service";

const SHARE_ENTITY_TYPES = new Set(["email", "calendar", "task"]);
const BOARD_DISPLAYS = new Set(["title_only", "title_date", "title_photo", "invite_card"]);

function isUpsertItemShareInput(body: unknown): body is UpsertItemShareInput {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return (
    typeof value.itemType === "string" &&
    SHARE_ENTITY_TYPES.has(value.itemType) &&
    typeof value.itemId === "string" &&
    typeof value.sharedToBoard === "boolean" &&
    (value.boardDisplay === undefined ||
      (typeof value.boardDisplay === "string" && BOARD_DISPLAYS.has(value.boardDisplay)))
  );
}

export function registerItemShareRoutes(app: Express): void {
  app.get("/api/item-shares", async (_req, res) => {
    try {
      res.json(await listItemShares());
    } catch (error) {
      console.error("GET /api/item-shares failed:", error);
      res.status(500).json({ message: "Failed to load item shares" });
    }
  });

  app.get("/api/item-shares/for/:type/:id", async (req, res) => {
    const { type, id } = req.params;
    if (!SHARE_ENTITY_TYPES.has(type)) {
      res.status(400).json({ message: "Invalid entity type" });
      return;
    }

    try {
      const share = await getItemShareForEntity(type, id);
      res.json(share);
    } catch (error) {
      console.error("GET /api/item-shares/for failed:", error);
      res.status(500).json({ message: "Failed to load item share" });
    }
  });

  app.put("/api/item-shares", async (req, res) => {
    if (!isUpsertItemShareInput(req.body)) {
      res.status(400).json({ message: "Invalid item share payload" });
      return;
    }

    try {
      const share = await upsertItemShare(req.body);
      res.json(share);
    } catch (error) {
      console.error("PUT /api/item-shares failed:", error);
      const message = error instanceof Error ? error.message : "Failed to save item share";
      res.status(500).json({ message });
    }
  });
}
