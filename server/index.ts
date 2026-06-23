import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { registerRoutes } from "./routes";
import { log, serveStatic, setupVite } from "./vite";
import { applyPendingMigrations } from "./db/apply-migrations";

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    if (path.startsWith("/api")) {
      const duration = Date.now() - start;
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  try {
    await applyPendingMigrations();
  } catch (error) {
    console.error("Failed to apply database migrations:", error);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }

  const server = await registerRoutes(app);

  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as { status?: number; statusCode?: number; message?: string };
    const status = error.status ?? error.statusCode ?? 500;
    const message = error.message ?? "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  const port = parseInt(process.env.PORT ?? "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
