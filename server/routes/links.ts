import type { Express } from "express";
import type { CreateLinkInput, EntityType } from "../../shared/links";
import {
  createLink,
  deleteLink,
  getLinksForEntity,
  listLinks,
} from "../services/link-service";

const ENTITY_TYPES = new Set(["email", "calendar", "task", "board_pin", "folder_ref"]);
const LINK_KINDS = new Set(["created_from", "relates_to", "follow_up", "folder_ref"]);

function isCreateLinkInput(body: unknown): body is CreateLinkInput {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return (
    typeof value.fromType === "string" &&
    ENTITY_TYPES.has(value.fromType) &&
    typeof value.fromId === "string" &&
    typeof value.toType === "string" &&
    ENTITY_TYPES.has(value.toType) &&
    typeof value.toId === "string" &&
    typeof value.kind === "string" &&
    LINK_KINDS.has(value.kind)
  );
}

export function registerLinkRoutes(app: Express): void {
  app.get("/api/links", async (_req, res) => {
    try {
      const data = await listLinks();
      res.json(data);
    } catch (error) {
      console.error("GET /api/links failed:", error);
      res.status(500).json({ message: "Failed to load links" });
    }
  });

  app.get("/api/links/for/:type/:id", async (req, res) => {
    const { type, id } = req.params;
    if (!ENTITY_TYPES.has(type)) {
      res.status(400).json({ message: "Invalid entity type" });
      return;
    }

    try {
      const data = await getLinksForEntity(type, id);
      res.json(data);
    } catch (error) {
      console.error("GET /api/links/for failed:", error);
      res.status(500).json({ message: "Failed to load links" });
    }
  });

  app.post("/api/links", async (req, res) => {
    if (!isCreateLinkInput(req.body)) {
      res.status(400).json({ message: "Invalid link payload" });
      return;
    }

    try {
      const link = await createLink(req.body);
      res.status(201).json(link);
    } catch (error) {
      console.error("POST /api/links failed:", error);
      const message = error instanceof Error ? error.message : "Failed to create link";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/links/:id", async (req, res) => {
    try {
      const deleted = await deleteLink(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: "Link not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/links failed:", error);
      res.status(500).json({ message: "Failed to delete link" });
    }
  });
}
