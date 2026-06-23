import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

export async function registerRoutes(app: Express): Promise<Server> {
  registerObjectStorageRoutes(app);

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
