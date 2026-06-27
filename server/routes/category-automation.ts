import type { Express } from "express";
import type { CategoryAutomationMap } from "../../shared/categoryAutomation";
import {
  getCategoryAutomationMap,
  saveCategoryAutomationMap,
} from "../services/category-automation-service";

function isCategoryAutomationMap(body: unknown): body is CategoryAutomationMap {
  return Boolean(body) && typeof body === "object" && !Array.isArray(body);
}

export function registerCategoryAutomationRoutes(app: Express): void {
  app.get("/api/category-automation", async (_req, res) => {
    try {
      const map = await getCategoryAutomationMap();
      res.json(map);
    } catch (error) {
      console.error("GET /api/category-automation failed:", error);
      res.status(500).json({ message: "Failed to load category rules" });
    }
  });

  app.put("/api/category-automation", async (req, res) => {
    if (!isCategoryAutomationMap(req.body)) {
      res.status(400).json({ message: "Invalid category automation payload" });
      return;
    }

    try {
      const map = await saveCategoryAutomationMap(req.body);
      res.json(map);
    } catch (error) {
      console.error("PUT /api/category-automation failed:", error);
      const message =
        error instanceof Error ? error.message : "Failed to save category rules";
      res.status(500).json({ message });
    }
  });
}
