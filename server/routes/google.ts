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
import {
  copyEmailToGoogleDriveFolder,
  deleteGoogleMail,
  fetchGoogleCalendarEvents,
  fetchGoogleCalendars,
  fetchGoogleDriveFolders,
  fetchGoogleMailFolders,
  fetchGoogleMessages,
  replyGoogleMail,
  sendGoogleMail,
} from "../services/google-api-service";
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

  app.get("/api/google/mail/folders", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const folders = await fetchGoogleMailFolders(accountId);
      res.json(folders);
    } catch (error) {
      console.error("GET /api/google/mail/folders failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Gmail labels";
      res.status(500).json({ message });
    }
  });

  app.get("/api/google/mail", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const labelId = typeof req.query.labelId === "string" ? req.query.labelId : "INBOX";
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const messages = await fetchGoogleMessages(accountId, 50, labelId);
      res.json(messages);
    } catch (error) {
      console.error("GET /api/google/mail failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Gmail messages";
      res.status(500).json({ message });
    }
  });

  app.get("/api/google/calendar", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const calendarId =
      typeof req.query.calendarId === "string" ? req.query.calendarId : undefined;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const events = await fetchGoogleCalendarEvents(accountId, undefined, undefined, calendarId);
      res.json(events);
    } catch (error) {
      console.error("GET /api/google/calendar failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Google Calendar";
      res.status(500).json({ message });
    }
  });

  app.get("/api/google/calendars", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const calendars = await fetchGoogleCalendars(accountId);
      res.json(calendars);
    } catch (error) {
      console.error("GET /api/google/calendars failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Google calendars";
      res.status(500).json({ message });
    }
  });

  app.post("/api/google/mail/send", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const to = Array.isArray(req.body?.to)
      ? req.body.to.filter((entry: unknown) => typeof entry === "string")
      : typeof req.body?.to === "string"
        ? [req.body.to]
        : [];
    const subject = typeof req.body?.subject === "string" ? req.body.subject : null;
    const body = typeof req.body?.body === "string" ? req.body.body : null;

    if (!accountId || !subject || body === null) {
      res.status(400).json({ message: "Invalid send mail payload" });
      return;
    }

    try {
      await sendGoogleMail(accountId, { to, subject, body });
      res.status(204).send();
    } catch (error) {
      console.error("POST /api/google/mail/send failed:", error);
      const message = error instanceof Error ? error.message : "Failed to send mail";
      res.status(500).json({ message });
    }
  });

  app.post("/api/google/mail/:externalId/reply", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const comment = typeof req.body?.comment === "string" ? req.body.comment : null;
    const replyAll = req.body?.replyAll === true;
    const { externalId } = req.params;

    if (!accountId || !comment || !externalId) {
      res.status(400).json({ message: "Invalid reply payload" });
      return;
    }

    try {
      await replyGoogleMail(accountId, externalId, { comment, replyAll });
      res.status(204).send();
    } catch (error) {
      console.error("POST /api/google/mail/:externalId/reply failed:", error);
      const message = error instanceof Error ? error.message : "Failed to send reply";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/google/mail/:externalId", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const { externalId } = req.params;

    if (!accountId || !externalId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      await deleteGoogleMail(accountId, externalId);
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/google/mail/:externalId failed:", error);
      const message = error instanceof Error ? error.message : "Failed to delete mail";
      res.status(500).json({ message });
    }
  });

  app.get("/api/google/drive/folders", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const parentId = typeof req.query.parentId === "string" ? req.query.parentId : undefined;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const folders = await fetchGoogleDriveFolders(accountId, parentId);
      res.json(folders);
    } catch (error) {
      console.error("GET /api/google/drive/folders failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Drive folders";
      res.status(500).json({ message });
    }
  });

  app.post("/api/google/drive/copy-email", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const folderId = typeof req.body?.folderId === "string" ? req.body.folderId : null;
    const subject = typeof req.body?.subject === "string" ? req.body.subject : null;
    const from = typeof req.body?.from === "string" ? req.body.from : "";
    const fromEmail = typeof req.body?.fromEmail === "string" ? req.body.fromEmail : "";
    const date = typeof req.body?.date === "string" ? req.body.date : new Date().toISOString();
    const body = typeof req.body?.body === "string" ? req.body.body : "";

    if (!accountId || !folderId || !subject) {
      res.status(400).json({ message: "Invalid copy-email payload" });
      return;
    }

    try {
      const result = await copyEmailToGoogleDriveFolder(accountId, folderId, {
        subject,
        from,
        fromEmail,
        date,
        body,
      });
      res.json(result);
    } catch (error) {
      console.error("POST /api/google/drive/copy-email failed:", error);
      const message = error instanceof Error ? error.message : "Failed to copy email to Drive";
      res.status(500).json({ message });
    }
  });
}
