import type { Express } from "express";
import type { HouseholdLocalDataDocument } from "../../shared/householdLocalData";
import {
  getHouseholdLocalDataDocument,
  saveHouseholdLocalDataDocument,
} from "../services/household-local-data-service";

function isHouseholdLocalDataDocument(body: unknown): body is HouseholdLocalDataDocument {
  return Boolean(body) && typeof body === "object" && !Array.isArray(body);
}

export function registerHouseholdLocalDataRoutes(app: Express): void {
  app.get("/api/household-local-data", async (_req, res) => {
    try {
      const doc = await getHouseholdLocalDataDocument();
      res.json(doc);
    } catch (error) {
      console.error("GET /api/household-local-data failed:", error);
      res.status(500).json({ message: "Failed to load household data" });
    }
  });

  app.put("/api/household-local-data", async (req, res) => {
    if (!isHouseholdLocalDataDocument(req.body)) {
      res.status(400).json({ message: "Invalid household data payload" });
      return;
    }

    try {
      const doc = await saveHouseholdLocalDataDocument(req.body);
      res.json(doc);
    } catch (error) {
      console.error("PUT /api/household-local-data failed:", error);
      const message =
        error instanceof Error ? error.message : "Failed to save household data";
      res.status(500).json({ message });
    }
  });
}
