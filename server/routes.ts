import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth/setup-auth";
import { getDatabaseStatus } from "./db/apply-migrations";
import { isDatabaseConfigured } from "./db/index";
import { createApiAuthGate } from "./middleware/require-auth";
import { registerAuthRoutes } from "./routes/auth";
import { registerLinkRoutes } from "./routes/links";
import { registerItemShareRoutes } from "./routes/item-shares";
import { registerBoardPinRoutes } from "./routes/board-pins";
import { registerAttachmentRoutes } from "./routes/attachments";
import { registerMicrosoftRoutes } from "./routes/microsoft";
import { registerSuperAdminRoutes } from "./routes/super-admin";

export async function registerRoutes(app: Express): Promise<Server> {
  const authActive = setupAuth(app);
  app.use(createApiAuthGate(authActive));

  registerAuthRoutes(app);
  registerSuperAdminRoutes(app);

  if (process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
    const { registerObjectStorageRoutes } = await import(
      "./replit_integrations/object_storage/routes"
    );
    registerObjectStorageRoutes(app);
  }

  registerLinkRoutes(app);
  registerItemShareRoutes(app);
  registerBoardPinRoutes(app);
  registerAttachmentRoutes(app);
  registerMicrosoftRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      app: "weekflow",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/status", async (_req, res) => {
    const objectStorageConfigured = Boolean(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID);
    const microsoftConfigured = Boolean(
      process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET,
    );
    let microsoftConnected = false;
    try {
      const { listConnectedAccounts } = await import("./services/connected-account-service");
      const accounts = await listConnectedAccounts();
      microsoftConnected = accounts.length > 0;
    } catch {
      microsoftConnected = false;
    }

    if (!isDatabaseConfigured()) {
      res.json({
        database: "not configured",
        objectStorage: objectStorageConfigured ? "configured" : "not configured",
        microsoft: microsoftConfigured
          ? microsoftConnected
            ? "connected"
            : "configured"
          : "not configured",
        phase: "prototype",
        tables: 0,
        weekflowTables: [],
      });
      return;
    }

    try {
      const dbStatus = await getDatabaseStatus();
      const schemaReady = dbStatus.weekflowTables.length >= 9;

      res.json({
        database: dbStatus.connected ? (schemaReady ? "ready" : "configured") : "error",
        objectStorage: objectStorageConfigured ? "configured" : "not configured",
        microsoft: microsoftConfigured
          ? microsoftConnected
            ? "connected"
            : "configured"
          : "not configured",
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
        microsoft: microsoftConfigured ? "configured" : "not configured",
        phase: "prototype",
        tables: 0,
        weekflowTables: [],
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
