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
  deleteMicrosoftCalendarEvent,
  deleteMicrosoftNote,
  deleteMicrosoftTodoTask,
  completeMicrosoftTodoTask,
  getMicrosoftSchedule,
  respondToMicrosoftCalendarEvent,
  fetchMicrosoftCalendarEvents,
  fetchMicrosoftCalendars,
  deleteMicrosoftContact,
  fetchMicrosoftContacts,
  createMicrosoftContact,
  updateMicrosoftContact,
  fetchMicrosoftMailFolders,
  fetchMicrosoftMessages,
  fetchMicrosoftNotes,
  fetchMicrosoftTodoLists,
  fetchMicrosoftTodoListsAndTasks,
  fetchMicrosoftTodoTasks,
  replyMicrosoftMail,
  sendMicrosoftMail,
  deleteMicrosoftMail,
  downloadMicrosoftMessageAttachment,
  fetchMicrosoftMessageAttachments,
  forwardMicrosoftMail,
  moveMicrosoftMail,
  saveMicrosoftMailDraft,
  searchMicrosoftMessages,
  updateMicrosoftMailReadState,
  fetchSharedMailboxFolders,
  getAutomaticRepliesSettings,
  setAutomaticRepliesSettings,
  fetchOutlookMasterCategories,
  fetchMicrosoftMailRules,
  updateMicrosoftMailCategories,
  fetchMicrosoftTeamsChats,
  createMicrosoftTeamsMeeting,
  fetchOneDriveItems,
  uploadOneDriveFile,
  deleteOneDriveItem,
  sendMicrosoftMailWithDriveAttachments,
  copyEmailToOneDriveFolder,
  syncCalendarItemToMicrosoft,
  syncMicrosoftTodoTask,
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

  app.patch("/api/microsoft/mail/:externalId/read", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const isRead = req.body?.isRead === true;
    const { externalId } = req.params;

    if (!accountId || !externalId) {
      res.status(400).json({ message: "Invalid read-state payload" });
      return;
    }

    try {
      await updateMicrosoftMailReadState(accountId, externalId, isRead);
      res.status(204).send();
    } catch (error) {
      console.error("PATCH /api/microsoft/mail/:externalId/read failed:", error);
      const message = error instanceof Error ? error.message : "Failed to update read state";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/mail/:externalId/move", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const destinationFolderId =
      typeof req.body?.destinationFolderId === "string" ? req.body.destinationFolderId : null;
    const { externalId } = req.params;

    if (!accountId || !destinationFolderId || !externalId) {
      res.status(400).json({ message: "Invalid move payload" });
      return;
    }

    try {
      await moveMicrosoftMail(accountId, externalId, destinationFolderId);
      res.status(204).send();
    } catch (error) {
      console.error("POST /api/microsoft/mail/:externalId/move failed:", error);
      const message = error instanceof Error ? error.message : "Failed to move message";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/mail/:externalId/forward", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const comment = typeof req.body?.comment === "string" ? req.body.comment : "";
    const to = Array.isArray(req.body?.to)
      ? req.body.to.filter((entry: unknown) => typeof entry === "string")
      : typeof req.body?.to === "string"
        ? [req.body.to]
        : [];
    const { externalId } = req.params;

    if (!accountId || !externalId || to.length === 0) {
      res.status(400).json({ message: "Invalid forward payload" });
      return;
    }

    try {
      await forwardMicrosoftMail(accountId, externalId, { comment, to });
      res.status(204).send();
    } catch (error) {
      console.error("POST /api/microsoft/mail/:externalId/forward failed:", error);
      const message = error instanceof Error ? error.message : "Failed to forward message";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/mail/search", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (!accountId || !query) {
      res.status(400).json({ message: "accountId and q are required" });
      return;
    }

    try {
      const messages = await searchMicrosoftMessages(accountId, query);
      res.json(messages);
    } catch (error) {
      console.error("GET /api/microsoft/mail/search failed:", error);
      const message = error instanceof Error ? error.message : "Failed to search mail";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/mail/:externalId/attachments", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const { externalId } = req.params;

    if (!accountId || !externalId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const attachments = await fetchMicrosoftMessageAttachments(accountId, externalId);
      res.json(attachments);
    } catch (error) {
      console.error("GET /api/microsoft/mail/:externalId/attachments failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch attachments";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/mail/:externalId/attachments/:attachmentId", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const { externalId, attachmentId } = req.params;

    if (!accountId || !externalId || !attachmentId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const file = await downloadMicrosoftMessageAttachment(accountId, externalId, attachmentId);
      const inline =
        req.query.inline === "true" || file.contentType.startsWith("image/");
      res.setHeader("Content-Type", file.contentType);
      res.setHeader(
        "Content-Disposition",
        inline
          ? `inline; filename="${file.name.replace(/"/g, "")}"`
          : `attachment; filename="${file.name.replace(/"/g, "")}"`,
      );
      res.send(file.buffer);
    } catch (error) {
      console.error("GET attachment download failed:", error);
      const message = error instanceof Error ? error.message : "Failed to download attachment";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/mail/draft", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const subject = typeof req.body?.subject === "string" ? req.body.subject : "";
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    const to = Array.isArray(req.body?.to)
      ? req.body.to.filter((entry: unknown) => typeof entry === "string")
      : typeof req.body?.to === "string"
        ? [req.body.to]
        : [];
    const draftId = typeof req.body?.draftId === "string" ? req.body.draftId : undefined;

    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const result = await saveMicrosoftMailDraft(accountId, { to, subject, body, draftId });
      res.json(result);
    } catch (error) {
      console.error("POST /api/microsoft/mail/draft failed:", error);
      const message = error instanceof Error ? error.message : "Failed to save draft";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/outlook/categories", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }
    try {
      res.json(await fetchOutlookMasterCategories(accountId));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch categories" });
    }
  });

  app.get("/api/microsoft/outlook/rules", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }
    try {
      res.json(await fetchMicrosoftMailRules(accountId));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch rules" });
    }
  });

  app.get("/api/microsoft/outlook/automatic-replies", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }
    try {
      res.json(await getAutomaticRepliesSettings(accountId));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch OOF" });
    }
  });

  app.patch("/api/microsoft/outlook/automatic-replies", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }
    try {
      await setAutomaticRepliesSettings(accountId, req.body?.settings ?? {});
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update OOF" });
    }
  });

  app.get("/api/microsoft/mail/shared-folders", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const sharedMailboxEmail = typeof req.query.sharedMailboxEmail === "string" ? req.query.sharedMailboxEmail : null;
    if (!accountId || !sharedMailboxEmail) {
      res.status(400).json({ message: "accountId and sharedMailboxEmail are required" });
      return;
    }
    try {
      res.json(await fetchSharedMailboxFolders(accountId, sharedMailboxEmail));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch shared mailbox" });
    }
  });

  app.patch("/api/microsoft/mail/:externalId/categories", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const categories = Array.isArray(req.body?.categories)
      ? req.body.categories.filter((entry: unknown) => typeof entry === "string")
      : [];
    const { externalId } = req.params;
    if (!accountId || !externalId) {
      res.status(400).json({ message: "Invalid categories payload" });
      return;
    }
    try {
      await updateMicrosoftMailCategories(accountId, externalId, categories);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update categories" });
    }
  });

  app.get("/api/microsoft/teams/chats", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }
    try {
      res.json(await fetchMicrosoftTeamsChats(accountId));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch Teams chats" });
    }
  });

  app.post("/api/microsoft/teams/meetings", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const subject = typeof req.body?.subject === "string" ? req.body.subject : null;
    const start = typeof req.body?.start === "string" ? req.body.start : null;
    const end = typeof req.body?.end === "string" ? req.body.end : null;
    if (!accountId || !subject || !start || !end) {
      res.status(400).json({ message: "Invalid Teams meeting payload" });
      return;
    }
    try {
      res.json(await createMicrosoftTeamsMeeting(accountId, { subject, start, end }));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create Teams meeting" });
    }
  });

  app.get("/api/microsoft/drive/folders", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const parentId = typeof req.query.parentId === "string" ? req.query.parentId : undefined;

    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const folders = await fetchOneDriveFolders(accountId, parentId);
      res.json(folders);
    } catch (error) {
      console.error("GET /api/microsoft/drive/folders failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch OneDrive folders";
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/drive/items", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const parentId = typeof req.query.parentId === "string" ? req.query.parentId : undefined;

    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const items = await fetchOneDriveItems(accountId, parentId);
      res.json(items);
    } catch (error) {
      console.error("GET /api/microsoft/drive/items failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch OneDrive items";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/drive/upload", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const parentId = typeof req.body?.parentId === "string" ? req.body.parentId : null;
    const fileName = typeof req.body?.fileName === "string" ? req.body.fileName : null;
    const contentBase64 = typeof req.body?.contentBase64 === "string" ? req.body.contentBase64 : null;

    if (!accountId || !parentId || !fileName || !contentBase64) {
      res.status(400).json({ message: "Invalid upload payload" });
      return;
    }

    try {
      const result = await uploadOneDriveFile(
        accountId,
        parentId,
        fileName,
        Buffer.from(contentBase64, "base64"),
        typeof req.body?.contentType === "string" ? req.body.contentType : undefined,
      );
      res.json(result);
    } catch (error) {
      console.error("POST /api/microsoft/drive/upload failed:", error);
      const message = error instanceof Error ? error.message : "Failed to upload file";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/microsoft/drive/items/:itemId", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const { itemId } = req.params;

    if (!accountId || !itemId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      await deleteOneDriveItem(accountId, itemId);
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/microsoft/drive/items/:itemId failed:", error);
      const message = error instanceof Error ? error.message : "Failed to delete file";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/mail/send-with-attachments", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const to = Array.isArray(req.body?.to)
      ? req.body.to.filter((entry: unknown) => typeof entry === "string")
      : typeof req.body?.to === "string"
        ? [req.body.to]
        : [];
    const subject = typeof req.body?.subject === "string" ? req.body.subject : null;
    const body = typeof req.body?.body === "string" ? req.body.body : null;
    const driveAttachmentIds = Array.isArray(req.body?.driveAttachmentIds)
      ? req.body.driveAttachmentIds.filter((entry: unknown) => typeof entry === "string")
      : [];

    if (!accountId || !subject || body === null) {
      res.status(400).json({ message: "Invalid send mail payload" });
      return;
    }

    try {
      await sendMicrosoftMailWithDriveAttachments(accountId, {
        to,
        subject,
        body,
        driveAttachmentIds,
      });
      res.status(204).send();
    } catch (error) {
      console.error("POST /api/microsoft/mail/send-with-attachments failed:", error);
      const message = error instanceof Error ? error.message : "Failed to send mail";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/drive/copy-email", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const folderId = typeof req.body?.folderId === "string" ? req.body.folderId : null;
    const subject = typeof req.body?.subject === "string" ? req.body.subject : null;
    const from = typeof req.body?.from === "string" ? req.body.from : "";
    const fromEmail = typeof req.body?.fromEmail === "string" ? req.body.fromEmail : "";
    const date = typeof req.body?.date === "string" ? req.body.date : "";
    const body = typeof req.body?.body === "string" ? req.body.body : "";

    if (!accountId || !folderId || !subject) {
      res.status(400).json({ message: "Invalid copy-email payload" });
      return;
    }

    try {
      const result = await copyEmailToOneDriveFolder(accountId, folderId, {
        subject,
        from,
        fromEmail,
        date,
        body,
      });
      res.json(result);
    } catch (error) {
      console.error("POST /api/microsoft/drive/copy-email failed:", error);
      const message = error instanceof Error ? error.message : "Failed to copy email to OneDrive";
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
      const includeChildFolders =
        req.query.includeChildFolders === "true" || req.query.recursive === "true";
      const folders = await fetchMicrosoftMailFolders(accountId, { includeChildFolders });
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
    const defaultOnly =
      req.query.defaultOnly === "true" || req.query.defaultOnly === "1";

    try {
      const events = await fetchMicrosoftCalendarEvents(
        accountId,
        startDate,
        endDate,
        calendarId,
        { defaultOnly },
      );
      res.json(events);
    } catch (error) {
      console.error("GET /api/microsoft/calendar failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Outlook calendar";
      if (
        message.includes("(429)") ||
        message.includes("ApplicationThrottled") ||
        message.includes("MailboxConcurrency")
      ) {
        res.json([]);
        return;
      }
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

  app.post("/api/microsoft/calendar/schedule", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const emails = Array.isArray(req.body?.emails)
      ? req.body.emails.filter((entry: unknown) => typeof entry === "string")
      : [];
    const start = typeof req.body?.start === "string" ? req.body.start : null;
    const end = typeof req.body?.end === "string" ? req.body.end : null;

    if (!accountId || emails.length === 0 || !start || !end) {
      res.status(400).json({ message: "Invalid schedule payload" });
      return;
    }

    try {
      const schedule = await getMicrosoftSchedule(accountId, { emails, start, end });
      res.json(schedule);
    } catch (error) {
      console.error("POST /api/microsoft/calendar/schedule failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch schedule";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/calendar/:externalId/respond", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const response =
      req.body?.response === "accept" ||
      req.body?.response === "decline" ||
      req.body?.response === "tentativelyAccept"
        ? req.body.response
        : null;
    const comment = typeof req.body?.comment === "string" ? req.body.comment : undefined;
    const { externalId } = req.params;

    if (!accountId || !response || !externalId) {
      res.status(400).json({ message: "Invalid RSVP payload" });
      return;
    }

    try {
      await respondToMicrosoftCalendarEvent(accountId, externalId, response, comment);
      res.status(204).send();
    } catch (error) {
      console.error("POST /api/microsoft/calendar/:externalId/respond failed:", error);
      const message = error instanceof Error ? error.message : "Failed to respond to invite";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/microsoft/calendar/:externalId", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const calendarId = typeof req.query.calendarId === "string" ? req.query.calendarId : undefined;
    const { externalId } = req.params;

    if (!accountId || !externalId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      await deleteMicrosoftCalendarEvent(accountId, externalId, calendarId);
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/microsoft/calendar/:externalId failed:", error);
      const message = error instanceof Error ? error.message : "Failed to delete calendar event";
      res.status(500).json({ message });
    }
  });

  app.post("/api/microsoft/todo/sync", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const item = req.body?.item as
      | {
          localItemId: string;
          title: string;
          dueDate?: string;
          notes?: string;
          todoListId?: string;
          externalId?: string;
          completed?: boolean;
        }
      | undefined;

    if (!accountId || !item?.localItemId || !item.title) {
      res.status(400).json({ message: "Invalid To Do sync payload" });
      return;
    }

    try {
      const result = await syncMicrosoftTodoTask(accountId, item);
      res.json(result);
    } catch (error) {
      console.error("POST /api/microsoft/todo/sync failed:", error);
      const message = error instanceof Error ? error.message : "Failed to sync To Do task";
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

  app.patch("/api/microsoft/todo/:externalId/complete", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const todoListId = typeof req.body?.todoListId === "string" ? req.body.todoListId : null;
    const completed = req.body?.completed === true;
    const { externalId } = req.params;

    if (!accountId || !todoListId || !externalId) {
      res.status(400).json({ message: "Invalid To Do complete payload" });
      return;
    }

    try {
      await completeMicrosoftTodoTask(accountId, externalId, todoListId, completed);
      res.status(204).send();
    } catch (error) {
      console.error("PATCH /api/microsoft/todo/:externalId/complete failed:", error);
      const message = error instanceof Error ? error.message : "Failed to update To Do task";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/microsoft/todo/:externalId", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const todoListId = typeof req.query.todoListId === "string" ? req.query.todoListId : null;
    const { externalId } = req.params;

    if (!accountId || !todoListId || !externalId) {
      res.status(400).json({ message: "accountId and todoListId are required" });
      return;
    }

    try {
      await deleteMicrosoftTodoTask(accountId, externalId, todoListId);
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/microsoft/todo/:externalId failed:", error);
      const message = error instanceof Error ? error.message : "Failed to delete To Do task";
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

  app.get("/api/microsoft/todo/bundle", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const bundle = await fetchMicrosoftTodoListsAndTasks(accountId);
      res.json(bundle);
    } catch (error) {
      console.error("GET /api/microsoft/todo/bundle failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch To Do data";
      if (
        message.includes("(429)") ||
        message.includes("ApplicationThrottled") ||
        message.includes("MailboxConcurrency")
      ) {
        res.json({ lists: [], tasks: [] });
        return;
      }
      res.status(500).json({ message });
    }
  });

  app.get("/api/microsoft/todo/tasks", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const tasks = await fetchMicrosoftTodoTasks(accountId);
      res.json(tasks);
    } catch (error) {
      console.error("GET /api/microsoft/todo/tasks failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch To Do tasks";
      if (
        message.includes("(429)") ||
        message.includes("ApplicationThrottled") ||
        message.includes("MailboxConcurrency")
      ) {
        res.json([]);
        return;
      }
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

  app.post("/api/microsoft/contacts", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const name = typeof req.body?.name === "string" ? req.body.name : null;
    if (!accountId || !name) {
      res.status(400).json({ message: "Invalid contact payload" });
      return;
    }

    try {
      const result = await createMicrosoftContact(accountId, {
        name,
        email: typeof req.body?.email === "string" ? req.body.email : undefined,
        emailSecondary:
          typeof req.body?.emailSecondary === "string" ? req.body.emailSecondary : undefined,
        phone: typeof req.body?.phone === "string" ? req.body.phone : undefined,
        mobilePhone: typeof req.body?.mobilePhone === "string" ? req.body.mobilePhone : undefined,
        homePhone: typeof req.body?.homePhone === "string" ? req.body.homePhone : undefined,
        company: typeof req.body?.company === "string" ? req.body.company : undefined,
        jobTitle: typeof req.body?.jobTitle === "string" ? req.body.jobTitle : undefined,
        department: typeof req.body?.department === "string" ? req.body.department : undefined,
        website: typeof req.body?.website === "string" ? req.body.website : undefined,
        address: typeof req.body?.address === "string" ? req.body.address : undefined,
        birthday: typeof req.body?.birthday === "string" ? req.body.birthday : undefined,
        notes: typeof req.body?.notes === "string" ? req.body.notes : undefined,
      });
      res.status(201).json(result);
    } catch (error) {
      console.error("POST /api/microsoft/contacts failed:", error);
      const message = error instanceof Error ? error.message : "Failed to create contact";
      res.status(500).json({ message });
    }
  });

  app.patch("/api/microsoft/contacts/:externalId", async (req, res) => {
    const accountId = typeof req.body?.accountId === "string" ? req.body.accountId : null;
    const name = typeof req.body?.name === "string" ? req.body.name : null;
    const { externalId } = req.params;
    if (!accountId || !name || !externalId) {
      res.status(400).json({ message: "Invalid contact update payload" });
      return;
    }

    try {
      await updateMicrosoftContact(accountId, externalId, {
        name,
        email: typeof req.body?.email === "string" ? req.body.email : undefined,
        emailSecondary:
          typeof req.body?.emailSecondary === "string" ? req.body.emailSecondary : undefined,
        phone: typeof req.body?.phone === "string" ? req.body.phone : undefined,
        mobilePhone: typeof req.body?.mobilePhone === "string" ? req.body.mobilePhone : undefined,
        homePhone: typeof req.body?.homePhone === "string" ? req.body.homePhone : undefined,
        company: typeof req.body?.company === "string" ? req.body.company : undefined,
        jobTitle: typeof req.body?.jobTitle === "string" ? req.body.jobTitle : undefined,
        department: typeof req.body?.department === "string" ? req.body.department : undefined,
        website: typeof req.body?.website === "string" ? req.body.website : undefined,
        address: typeof req.body?.address === "string" ? req.body.address : undefined,
        birthday: typeof req.body?.birthday === "string" ? req.body.birthday : undefined,
        notes: typeof req.body?.notes === "string" ? req.body.notes : undefined,
      });
      res.status(204).send();
    } catch (error) {
      console.error("PATCH /api/microsoft/contacts/:externalId failed:", error);
      const message = error instanceof Error ? error.message : "Failed to update contact";
      res.status(500).json({ message });
    }
  });

  app.delete("/api/microsoft/contacts/:externalId", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    const { externalId } = req.params;
    if (!accountId || !externalId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      await deleteMicrosoftContact(accountId, externalId);
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/microsoft/contacts/:externalId failed:", error);
      const message = error instanceof Error ? error.message : "Failed to delete contact";
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
      const includeContent = req.query.includeContent === "true";
      const notes = await fetchMicrosoftNotes(accountId, 25, { includeContent });
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
