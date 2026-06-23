import type { Express } from "express";
import type {
  CreateBoardPinInput,
  CreateVoicePinInput,
  UpdateBoardPinInput,
} from "../../shared/boardPins";
import {
  createBoardPin,
  createVoiceBoardPin,
  listBoardPins,
  updateBoardPin,
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

function isCreateVoicePinInput(body: unknown): body is CreateVoicePinInput {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return typeof value.message === "string" && value.message.trim().length > 0;
}

function isUpdateBoardPinInput(body: unknown): body is UpdateBoardPinInput {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return (
    value.x === undefined ||
    typeof value.x === "number" ||
    value.y === undefined ||
    typeof value.y === "number" ||
    value.rotation === undefined ||
    typeof value.rotation === "number" ||
    value.pinStyle === undefined ||
    typeof value.pinStyle === "string" ||
    value.pinStyle === null ||
    value.contentJson === undefined ||
    (typeof value.contentJson === "object" && value.contentJson !== null)
  );
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

  app.post("/api/board-pins/voice", async (req, res) => {
    if (!isCreateVoicePinInput(req.body)) {
      res.status(400).json({ message: "Invalid voice pin payload" });
      return;
    }

    try {
      const pin = await createVoiceBoardPin(req.body);
      res.status(201).json(pin);
    } catch (error) {
      console.error("POST /api/board-pins/voice failed:", error);
      res.status(500).json({ message: "Failed to create voice pin" });
    }
  });

  app.patch("/api/board-pins/:id", async (req, res) => {
    if (!isUpdateBoardPinInput(req.body)) {
      res.status(400).json({ message: "Invalid board pin update payload" });
      return;
    }

    try {
      const pin = await updateBoardPin(req.params.id, req.body);
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
