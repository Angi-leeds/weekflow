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
  createMicrosoftNote,
  createMicrosoftTodoTask,
  deleteMicrosoftNote,
  fetchMicrosoftCalendarEvents,
  fetchMicrosoftCalendars,
  fetchMicrosoftContacts,
  fetchMicrosoftMailFolders,
  fetchMicrosoftMessages,
  fetchMicrosoftNotes,
  fetchMicrosoftTodoLists,
  replyMicrosoftMail,
  sendMicrosoftMail,
  deleteMicrosoftMail,
  syncCalendarItemToMicrosoft,
  updateMicrosoftNote,
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
    const folderId = typeof req.query.folderId === "string" ? req.query.folderId : undefined;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const messages = await fetchMicrosoftMessages(accountId, 50, folderId);
      res.json(messages);
    } catch (error) {
      console.error("GET /api/microsoft/mail failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Outlook mail";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/mail/send", async (req, res) => {
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
      await sendMicrosoftMail(accountId, { to, subject, body });
      res.status(204).send();
    } catch (error) {
      console.error("POST /api/microsoft/mail/send failed:", error);
      const message = error instanceof Error ? error.message : "Failed to send mail";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/mail/:externalId/reply", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const comment = typeof req.body?.comment === "string" ? req.body.comment : null;
    const replyAll = req.body?.replyAll === true;
    const { externalId } = req.params;

    if (!accountId || !comment || !externalId) {
      res.status(400).json({ message: "Invalid reply payload" });
      return;
    }

    try {
      await replyMicrosoftMail(accountId, externalId, { comment, replyAll });
      res.status(204).send();
    } catch (error) {
      console.error("POST /api/microsoft/mail/:externalId/reply failed:", error);
      const message = error instanceof Error ? error.message : "Failed to send reply";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/microsoft/mail/:externalId", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const { externalId } = req.params;

    if (!accountId || !externalId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      await deleteMicrosoftMail(accountId, externalId);
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/microsoft/mail/:externalId failed:", error);
      const message = error instanceof Error ? error.message : "Failed to delete mail";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/mail/folders", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const folders = await fetchMicrosoftMailFolders(accountId);
      res.json(folders);
    } catch (error) {
      console.error("GET /api/microsoft/mail/folders failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch mail folders";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/calendar", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    const calendarId = typeof req.query.calendarId === "string" ? req.query.calendarId : undefined;

    try {
      const events = await fetchMicrosoftCalendarEvents(
        accountId,
        startDate,
        endDate,
        calendarId,
      );
      res.json(events);
    } catch (error) {
      console.error("GET /api/microsoft/calendar failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Outlook calendar";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/calendars", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const calendars = await fetchMicrosoftCalendars(accountId);
      res.json(calendars);
    } catch (error) {
      console.error("GET /api/microsoft/calendars failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch calendars";
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
    const todoListId =
      typeof req.body?.todoListId === "string" ? req.body.todoListId : undefined;

    if (!accountId || !title) {
      res.status(400).json({ message: "Invalid To Do payload" });
      return;
    }

    try {
      const result = await createMicrosoftTodoTask(accountId, {
        title,
        dueDate: typeof req.body?.dueDate === "string" ? req.body.dueDate : undefined,
        notes: typeof req.body?.notes === "string" ? req.body.notes : undefined,
        todoListId,
      });
      res.status(201).json(result);
    } catch (error) {
      console.error("POST /api/microsoft/todo failed:", error);
      const message = error instanceof Error ? error.message : "Failed to create To Do task";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/todo/lists", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const lists = await fetchMicrosoftTodoLists(accountId);
      res.json(lists);
    } catch (error) {
      console.error("GET /api/microsoft/todo/lists failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch To Do lists";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/contacts", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const contacts = await fetchMicrosoftContacts(accountId);
      res.json(contacts);
    } catch (error) {
      console.error("GET /api/microsoft/contacts failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Outlook contacts";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/notes", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const notes = await fetchMicrosoftNotes(accountId);
      res.json(notes);
    } catch (error) {
      console.error("GET /api/microsoft/notes failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Outlook notes";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/notes", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const title = typeof req.body?.title === "string" ? req.body.title : null;
    const body = typeof req.body?.body === "string" ? req.body.body : "";

    if (!accountId || !title) {
      res.status(400).json({ message: "Invalid note payload" });
      return;
    }

    try {
      const result = await createMicrosoftNote(accountId, { title, body });
      res.status(201).json(result);
    } catch (error) {
      console.error("POST /api/microsoft/notes failed:", error);
      const message = error instanceof Error ? error.message : "Failed to create Outlook note";
      res.status(500).json({ message });
    }
  });

  app.patch("/api/microsoft/notes/:externalId", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const title = typeof req.body?.title === "string" ? req.body.title : null;
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    const { externalId } = req.params;

    if (!accountId || !title || !externalId) {
      res.status(400).json({ message: "Invalid note update payload" });
      return;
    }

    try {
      await updateMicrosoftNote(accountId, externalId, { title, body });
      res.status(204).send();
    } catch (error) {
      console.error("PATCH /api/microsoft/notes/:externalId failed:", error);
      const message = error instanceof Error ? error.message : "Failed to update Outlook note";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/microsoft/notes/:externalId", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const { externalId } = req.params;

    if (!accountId || !externalId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      await deleteMicrosoftNote(accountId, externalId);
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/microsoft/notes/:externalId failed:", error);
      const message = error instanceof Error ? error.message : "Failed to delete Outlook note";
      res.status(500).json({ message });
    }
  });
}
