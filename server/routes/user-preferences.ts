import type { Express } from "express";
import type { UserPreferencesDocument } from "../../shared/userPreferences";
import {
  getUserPreferencesDocument,
  saveUserPreferencesDocument,
} from "../services/user-preferences-service";

function isUserPreferencesDocument(body: unknown): body is UserPreferencesDocument {
  return Boolean(body) && typeof body === "object" && !Array.isArray(body);
}

export function registerUserPreferencesRoutes(app: Express): void {
  app.get("/api/user-preferences", async (_req, res) => {
    try {
      const doc = await getUserPreferencesDocument();
      res.json(doc);
    } catch (error) {
      console.error("GET /api/user-preferences failed:", error);
      res.status(500).json({ message: "Failed to load preferences" });
    }
  });

  app.put("/api/user-preferences", async (req, res) => {
    if (!isUserPreferencesDocument(req.body)) {
      res.status(400).json({ message: "Invalid preferences payload" });
      return;
    }

    try {
      const doc = await saveUserPreferencesDocument(req.body);
      res.json(doc);
    } catch (error) {
      console.error("PUT /api/user-preferences failed:", error);
      const message =
        error instanceof Error ? error.message : "Failed to save preferences";
      res.status(500).json({ message });
    }
  });
}
