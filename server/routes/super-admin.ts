import type { Express } from "express";
import { getSignupAllowlist, getSignupMode, getSuperAdminEmail } from "../config/auth-config";
import { requireAuthenticated, requireSuperAdmin } from "../middleware/require-auth";
import { getSuperAdminOverview } from "./auth";
import { listUsers } from "../services/user-service";

export function registerSuperAdminRoutes(app: Express): void {
  app.get("/api/super-admin/overview", requireAuthenticated, requireSuperAdmin, async (_req, res) => {
    try {
      const overview = await getSuperAdminOverview();
      res.json({
        ...overview,
        allowlistEmails: getSignupAllowlist(),
        superAdminEmail: getSuperAdminEmail(),
        signupMode: getSignupMode(),
      });
    } catch (error) {
      console.error("GET /api/super-admin/overview failed:", error);
      res.status(500).json({ message: "Failed to load super admin overview" });
    }
  });

  app.get("/api/super-admin/users", requireAuthenticated, requireSuperAdmin, async (_req, res) => {
    try {
      const users = await listUsers();
      res.json({ users });
    } catch (error) {
      console.error("GET /api/super-admin/users failed:", error);
      res.status(500).json({ message: "Failed to load users" });
    }
  });
}
