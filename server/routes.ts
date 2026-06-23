import type { Express } from "express";
import { createServer, type Server } from "http";
import { getDatabaseStatus } from "./db/apply-migrations";
import { isDatabaseConfigured } from "./db/index";
import { registerLinkRoutes } from "./routes/links";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

export async function registerRoutes(app: Express): Promise<Server> {
  registerObjectStorageRoutes(app);
  registerLinkRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      app: "weekflow",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/status", async (_req, res) => {
    const objectStorageConfigured = Boolean(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID);

    if (!isDatabaseConfigured()) {
      res.json({
        database: "not configured",
        objectStorage: objectStorageConfigured ? "configured" : "not configured",
        phase: "prototype",
        tables: 0,
        weekflowTables: [],
      });
      return;
    }

    try {
      const dbStatus = await getDatabaseStatus();
      const schemaReady = dbStatus.weekflowTables.length >= 6;

      res.json({
        database: dbStatus.connected ? (schemaReady ? "ready" : "configured") : "error",
        objectStorage: objectStorageConfigured ? "configured" : "not configured",
        phase: "prototype",
        tables: dbStatus.tables,
        weekflowTables: dbStatus.weekflowTables,
        schemaReady,
      });
    } catch (error) {
      console.error("Database status check failed:", error);
      res.status(503).json({
        database: "error",
        objectStorage: objectStorageConfigured ? "configured" : "not configured",
        phase: "prototype",
        tables: 0,
        weekflowTables: [],
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
