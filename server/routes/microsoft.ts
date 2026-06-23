import type { Express, Request, Response } from "express";
import type { CalendarSyncInput } from "../services/microsoft-graph-service";
import {
  buildMicrosoftAuthorizeUrl,
  consumeOAuthState,
  createOAuthState,
  exchangeMicrosoftAuthCode,
  getAppBaseUrl,
} from "../services/microsoft-auth-service";
import {
  createMicrosoftTodoTask,
  fetchMicrosoftMessages,
  syncCalendarItemToMicrosoft,
} from "../services/microsoft-graph-service";
import {
  deleteConnectedAccount,
  isMicrosoftOAuthConfigured,
  listConnectedAccounts,
} from "../services/connected-account-service";

function redirectWithMessage(res: Response, req: Request, params: Record<string, string>): void {
  const base = getAppBaseUrl(req);
  const query = new URLSearchParams(params).toString();
  res.redirect(`${base}/?section=settings&${query}`);
}

export function registerMicrosoftRoutes(app: Express): void {
  app.get("/api/microsoft/status", async (_req, res) => {
    try {
      const accounts = await listConnectedAccounts();
      res.json({
        configured: isMicrosoftOAuthConfigured(),
        connected: accounts.length > 0,
        accounts,
      });
    } catch (error) {
      console.error("GET /api/microsoft/status failed:", error);
      res.status(500).json({ message: "Failed to load Microsoft integration status" });
    }
  });

  app.get("/api/microsoft/auth/start", (req, res) => {
    if (!isMicrosoftOAuthConfigured()) {
      res.status(503).json({
        message: "Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to enable Microsoft sign-in.",
      });
      return;
    }

    const state = createOAuthState();
    res.redirect(buildMicrosoftAuthorizeUrl(req, state));
  });

  app.get("/api/microsoft/auth/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const oauthError = typeof req.query.error === "string" ? req.query.error : null;

    if (oauthError) {
      redirectWithMessage(res, req, { microsoft: "error", reason: oauthError });
      return;
    }

    if (!code || !consumeOAuthState(state ?? undefined)) {
      redirectWithMessage(res, req, { microsoft: "error", reason: "invalid_state" });
      return;
    }

    try {
      const result = await exchangeMicrosoftAuthCode(req, code);
      redirectWithMessage(res, req, {
        microsoft: "connected",
        email: result.email,
      });
    } catch (error) {
      console.error("Microsoft OAuth callback failed:", error);
      redirectWithMessage(res, req, { microsoft: "error", reason: "token_exchange" });
    }
  });

  app.delete("/api/microsoft/accounts/:id", async (req, res) => {
    try {
      const deleted = await deleteConnectedAccount(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: "Connected account not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/microsoft/accounts/:id failed:", error);
      res.status(500).json({ message: "Failed to disconnect Microsoft account" });
    }
  });

  app.get("/api/microsoft/mail", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const messages = await fetchMicrosoftMessages(accountId);
      res.json(messages);
    } catch (error) {
      console.error("GET /api/microsoft/mail failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Outlook mail";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/calendar/sync", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const item = req.body?.item as CalendarSyncInput | undefined;

    if (!accountId || !item?.localItemId || !item.title || !item.date) {
      res.status(400).json({ message: "Invalid calendar sync payload" });
      return;
    }

    try {
      const result = await syncCalendarItemToMicrosoft(accountId, item);
      res.json(result);
    } catch (error) {
      console.error("POST /api/microsoft/calendar/sync failed:", error);
      const message = error instanceof Error ? error.message : "Failed to sync calendar event";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/todo", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const title = typeof req.body?.title === "string" ? req.body.title : null;

    if (!accountId || !title) {
      res.status(400).json({ message: "Invalid To Do payload" });
      return;
    }

    try {
      const result = await createMicrosoftTodoTask(accountId, {
        title,
        dueDate: typeof req.body?.dueDate === "string" ? req.body.dueDate : undefined,
        notes: typeof req.body?.notes === "string" ? req.body.notes : undefined,
      });
      res.status(201).json(result);
    } catch (error) {
      console.error("POST /api/microsoft/todo failed:", error);
      const message = error instanceof Error ? error.message : "Failed to create To Do task";
      res.status(500).json({ message });
    }
  });
}
