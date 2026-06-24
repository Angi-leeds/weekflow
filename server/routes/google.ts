import type { Express, Request, Response } from "express";
import {
  buildGoogleAuthorizeUrl,
  consumeGoogleOAuthState,
  createGoogleOAuthState,
  exchangeGoogleAuthCode,
} from "../services/google-auth-service";
import {
  deleteConnectedAccount,
  isGoogleOAuthConfigured,
  listGoogleConnectedAccounts,
} from "../services/connected-account-service";
import { getAppBaseUrl } from "../services/microsoft-auth-service";

function redirectWithMessage(res: Response, req: Request, params: Record<string, string>): void {
  const base = getAppBaseUrl(req);
  const query = new URLSearchParams(params).toString();
  res.redirect(`${base}/?section=settings&${query}`);
}

export function registerGoogleRoutes(app: Express): void {
  app.get("/api/google/status", async (_req, res) => {
    try {
      const accounts = await listGoogleConnectedAccounts();
      res.json({
        configured: isGoogleOAuthConfigured(),
        connected: accounts.length > 0,
        accounts,
      });
    } catch (error) {
      console.error("GET /api/google/status failed:", error);
      res.status(500).json({ message: "Failed to load Google integration status" });
    }
  });

  app.get("/api/google/auth/start", (req, res) => {
    if (!isGoogleOAuthConfigured()) {
      res.status(503).json({
        message: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google sign-in.",
      });
      return;
    }

    const state = createGoogleOAuthState();
    res.redirect(buildGoogleAuthorizeUrl(req, state));
  });

  app.get("/api/google/auth/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const oauthError = typeof req.query.error === "string" ? req.query.error : null;

    if (oauthError) {
      redirectWithMessage(res, req, { google: "error", reason: oauthError });
      return;
    }

    if (!code || !consumeGoogleOAuthState(state ?? undefined)) {
      redirectWithMessage(res, req, { google: "error", reason: "invalid_state" });
      return;
    }

    try {
      const result = await exchangeGoogleAuthCode(req, code);
      redirectWithMessage(res, req, {
        google: "connected",
        email: result.email,
      });
    } catch (error) {
      console.error("Google OAuth callback failed:", error);
      redirectWithMessage(res, req, { google: "error", reason: "token_exchange" });
    }
  });

  app.delete("/api/google/accounts/:id", async (req, res) => {
    try {
      const deleted = await deleteConnectedAccount(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: "Connected account not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/google/accounts/:id failed:", error);
      res.status(500).json({ message: "Failed to disconnect Google account" });
    }
  });
}
