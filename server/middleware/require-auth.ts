import type { NextFunction, Request, Response } from "express";
import { isAuthEnabled } from "../config/auth-config";

const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/status",
  "/api/auth",
  "/api/microsoft/auth/callback",
];

function isPublicApiPath(path: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function createApiAuthGate(authActive: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!authActive || !isAuthEnabled()) {
      return next();
    }

    if (!req.path.startsWith("/api/")) {
      return next();
    }

    if (isPublicApiPath(req.path)) {
      return next();
    }

    if (req.isAuthenticated?.()) {
      return next();
    }

    return res.status(401).json({
      message: "Authentication required",
      error: "unauthenticated",
    });
  };
}

export function requireAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated?.()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  return next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!req.isAuthenticated?.() || !user?.isSuperAdmin) {
    return res.status(403).json({ message: "Super admin access required" });
  }
  return next();
}
