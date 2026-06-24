import type { Express } from "express";
import { getSignupAllowlist, getSignupMode, getSuperAdminEmail } from "../config/auth-config";
import { requireAuthenticated, requireSuperAdmin } from "../middleware/require-auth";
import { getSuperAdminOverview } from "./auth";
import { listUsers } from "../services/user-service";
import {
  createHouseholdInvite,
  listHouseholdInvites,
  revokeHouseholdInvite,
} from "../services/invite-service";

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

  app.get("/api/super-admin/invites", requireAuthenticated, requireSuperAdmin, async (_req, res) => {
    try {
      const invites = await listHouseholdInvites();
      res.json({ invites });
    } catch (error) {
      console.error("GET /api/super-admin/invites failed:", error);
      res.status(500).json({ message: "Failed to load invites" });
    }
  });

  app.post("/api/super-admin/invites", requireAuthenticated, requireSuperAdmin, async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const displayName =
      typeof req.body?.displayName === "string" ? req.body.displayName : undefined;

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    try {
      const result = await createHouseholdInvite({
        email,
        displayName,
        invitedBy: req.user!.id,
        req,
      });
      res.status(201).json({
        invite: {
          id: result.invite.id,
          email: result.invite.email,
          displayName: result.invite.displayName ?? undefined,
          inviteUrl: result.inviteUrl,
          expiresAt: result.invite.expiresAt.toISOString(),
          createdAt: result.invite.createdAt.toISOString(),
        },
        delivered: result.delivered,
        inviteUrl: result.inviteUrl,
      });
    } catch (error) {
      console.error("POST /api/super-admin/invites failed:", error);
      const message = error instanceof Error ? error.message : "Failed to create invite";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/super-admin/invites/:id", requireAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const deleted = await revokeHouseholdInvite(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: "Invite not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/super-admin/invites/:id failed:", error);
      res.status(500).json({ message: "Failed to revoke invite" });
    }
  });
}
