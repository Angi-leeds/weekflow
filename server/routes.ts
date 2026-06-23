import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      app: "weekflow",
      timestamp: new Date().toISOString(),
    });
  });

  // Placeholder for household sync, links, attachments metadata (Replit DB later).
  app.get("/api/status", (_req, res) => {
    res.json({
      database: process.env.DATABASE_URL ? "configured" : "not configured",
      objectStorage: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ? "configured" : "not configured",
      phase: "prototype",
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
