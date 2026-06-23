import type { Express } from "express";
import type { CreateBoardPinInput, UpdateBoardPinPositionInput } from "../../shared/boardPins";
import {
  createBoardPin,
  listBoardPins,
  updateBoardPinPosition,
} from "../services/board-pin-service";

const SHARE_ENTITY_TYPES = new Set(["email", "calendar", "task"]);

function isCreateBoardPinInput(body: unknown): body is CreateBoardPinInput {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return (
    typeof value.itemType === "string" &&
    SHARE_ENTITY_TYPES.has(value.itemType) &&
    typeof value.itemId === "string"
  );
}

function isUpdatePositionInput(body: unknown): body is UpdateBoardPinPositionInput {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return typeof value.x === "number" && typeof value.y === "number";
}

export function registerBoardPinRoutes(app: Express): void {
  app.get("/api/board-pins", async (_req, res) => {
    try {
      res.json(await listBoardPins());
    } catch (error) {
      console.error("GET /api/board-pins failed:", error);
      res.status(500).json({ message: "Failed to load board pins" });
    }
  });

  app.post("/api/board-pins", async (req, res) => {
    if (!isCreateBoardPinInput(req.body)) {
      res.status(400).json({ message: "Invalid board pin payload" });
      return;
    }

    try {
      const pin = await createBoardPin(req.body);
      res.status(201).json(pin);
    } catch (error) {
      console.error("POST /api/board-pins failed:", error);
      const message = error instanceof Error ? error.message : "Failed to create board pin";
      res.status(500).json({ message });
    }
  });

  app.patch("/api/board-pins/:id", async (req, res) => {
    if (!isUpdatePositionInput(req.body)) {
      res.status(400).json({ message: "Invalid position payload" });
      return;
    }

    try {
      const pin = await updateBoardPinPosition(req.params.id, req.body);
      if (!pin) {
        res.status(404).json({ message: "Board pin not found" });
        return;
      }
      res.json(pin);
    } catch (error) {
      console.error("PATCH /api/board-pins/:id failed:", error);
      res.status(500).json({ message: "Failed to update board pin" });
    }
  });
}
