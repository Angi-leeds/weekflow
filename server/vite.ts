import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { createLogger, createServer as createViteServer } from "vite";
import viteConfig from "../vite.config";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/** Avoid SPA HTML fallback for static asset paths (e.g. /assets/*.css). */
function isStaticAssetPath(urlPath: string): boolean {
  const pathname = urlPath.split("?")[0] ?? urlPath;
  return /\.[a-zA-Z0-9]+$/.test(pathname) && !pathname.endsWith(".html");
}

export function getClientDistPath(): string {
  return path.resolve(process.cwd(), "dist", "public");
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use(async (req, res, next) => {
    const url = req.originalUrl;

    if (isStaticAssetPath(req.path)) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }

    try {
      const templatePath = path.resolve(process.cwd(), "index.html");
      let template = await fs.promises.readFile(templatePath, "utf-8");
      template = template.replace(
        'src="/src/main.tsx"',
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = getClientDistPath();

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Run npm run build first.`,
    );
  }

  log(`serving client from ${distPath}`, "static");

  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (isStaticAssetPath(req.path)) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }

    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
