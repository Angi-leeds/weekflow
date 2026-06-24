import type { Express } from "express";
import type { CreateAppleAccountInput } from "../../shared/appleApi";
import {
  createAppleConnectedAccount,
  deleteAppleConnectedAccount,
  getAppleCalendarSubscribeUrl,
  listAppleConnectedAccounts,
  updateAppleConnectedAccount,
} from "../services/apple-account-service";
import { getConnectedAccountRecord } from "../services/connected-account-service";
import { fetchIcsCalendarEvents } from "../services/ics-calendar-service";

export function registerAppleRoutes(app: Express): void {
  app.get("/api/apple/status", async (_req, res) => {
    try {
      const accounts = await listAppleConnectedAccounts();
      res.json({
        connected: accounts.length > 0,
        accounts,
      });
    } catch (error) {
      console.error("GET /api/apple/status failed:", error);
      res.status(500).json({ message: "Failed to load Apple integration status" });
    }
  });

  app.post("/api/apple/accounts", async (req, res) => {
    const input = req.body as CreateAppleAccountInput | undefined;
    if (!input?.email || typeof input.email !== "string") {
      res.status(400).json({ message: "email is required" });
      return;
    }

    try {
      const account = await createAppleConnectedAccount(input);
      res.status(201).json(account);
    } catch (error) {
      console.error("POST /api/apple/accounts failed:", error);
      const message = error instanceof Error ? error.message : "Failed to link Apple account";
      res.status(400).json({ message });
    }
  });

  app.patch("/api/apple/accounts/:id", async (req, res) => {
    const displayName =
      typeof req.body?.displayName === "string" ? req.body.displayName : undefined;
    const calendarSubscribeUrl =
      typeof req.body?.calendarSubscribeUrl === "string"
        ? req.body.calendarSubscribeUrl
        : undefined;

    try {
      const account = await updateAppleConnectedAccount(req.params.id, {
        displayName,
        calendarSubscribeUrl,
      });
      if (!account) {
        res.status(404).json({ message: "Apple account not found" });
        return;
      }
      res.json(account);
    } catch (error) {
      console.error("PATCH /api/apple/accounts/:id failed:", error);
      const message = error instanceof Error ? error.message : "Failed to update Apple account";
      res.status(400).json({ message });
    }
  });

  app.delete("/api/apple/accounts/:id", async (req, res) => {
    try {
      const deleted = await deleteAppleConnectedAccount(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: "Apple account not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/apple/accounts/:id failed:", error);
      res.status(500).json({ message: "Failed to disconnect Apple account" });
    }
  });

  app.get("/api/apple/calendar", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : null;
    if (!accountId) {
      res.status(400).json({ message: "accountId is required" });
      return;
    }

    try {
      const record = await getConnectedAccountRecord(accountId);
      if (!record || record.provider !== "apple") {
        res.status(404).json({ message: "Apple account not found" });
        return;
      }

      const subscribeUrl = getAppleCalendarSubscribeUrl(record);
      if (!subscribeUrl) {
        res.json([]);
        return;
      }

      const events = await fetchIcsCalendarEvents(subscribeUrl, record);
      res.json(events);
    } catch (error) {
      console.error("GET /api/apple/calendar failed:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch Apple calendar";
      res.status(500).json({ message });
    }
  });
}
