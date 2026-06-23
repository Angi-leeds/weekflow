import type { Express, Request, Response } from "express";
import type {
  AttachmentEntityType,
  AttachmentKind,
} from "../../shared/attachments";
import {
  createAttachment,
  getAttachmentById,
  listAttachments,
  listAttachmentsForItem,
} from "../services/attachment-service";
import {
  isObjectStorageConfigured,
  readLocalAttachmentFile,
  uploadAttachmentFile,
} from "../services/storage-service";

const ENTITY_TYPES = new Set(["email", "calendar", "task"]);
const ATTACHMENT_KINDS = new Set(["photo", "pdf", "voice", "document", "url"]);

async function parseMultipartUpload(
  req: Request,
): Promise<{ fields: Record<string, string>; file: { buffer: Buffer; filename: string; mimeType: string } | null }> {
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("multipart/form-data")) {
    throw new Error("Expected multipart/form-data");
  }

  const { default: Busboy } = await import("busboy");
  const fields: Record<string, string> = {};
  let file: { buffer: Buffer; filename: string; mimeType: string } | null = null;

  await new Promise<void>((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: 10 * 1024 * 1024 },
    });

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (name, stream, info) => {
      if (name !== "file") {
        stream.resume();
        return;
      }

      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => reject(new Error("File too large (max 10MB)")));
      stream.on("end", () => {
        file = {
          buffer: Buffer.concat(chunks),
          filename: info.filename,
          mimeType: info.mimeType || "application/octet-stream",
        };
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", resolve);
    req.pipe(busboy);
  });

  return { fields, file };
}

export function registerAttachmentRoutes(app: Express): void {
  app.get("/api/attachments", async (_req, res) => {
    try {
      res.json(await listAttachments());
    } catch (error) {
      console.error("GET /api/attachments failed:", error);
      res.status(500).json({ message: "Failed to load attachments" });
    }
  });

  app.get("/api/attachments/for/:type/:id", async (req, res) => {
    const { type, id } = req.params;
    if (!ENTITY_TYPES.has(type)) {
      res.status(400).json({ message: "Invalid entity type" });
      return;
    }

    try {
      res.json(await listAttachmentsForItem(type, id));
    } catch (error) {
      console.error("GET /api/attachments/for failed:", error);
      res.status(500).json({ message: "Failed to load attachments" });
    }
  });

  app.post("/api/attachments", async (req, res) => {
    try {
      const { fields, file } = await parseMultipartUpload(req);
      if (!file) {
        res.status(400).json({ message: "Missing file" });
        return;
      }

      const itemType = fields.itemType;
      const itemId = fields.itemId;
      const kind = (fields.kind || "photo") as AttachmentKind;

      if (!itemType || !ENTITY_TYPES.has(itemType)) {
        res.status(400).json({ message: "Invalid itemType" });
        return;
      }
      if (!itemId) {
        res.status(400).json({ message: "Missing itemId" });
        return;
      }
      if (!ATTACHMENT_KINDS.has(kind)) {
        res.status(400).json({ message: "Invalid kind" });
        return;
      }

      const uploaded = await uploadAttachmentFile(file.buffer, file.mimeType, file.filename);
      const attachment = await createAttachment({
        itemType: itemType as AttachmentEntityType,
        itemId,
        kind,
        filename: file.filename,
        mimeType: file.mimeType,
        storageKey: uploaded.storageKey,
      });

      res.status(201).json(attachment);
    } catch (error) {
      console.error("POST /api/attachments failed:", error);
      const message = error instanceof Error ? error.message : "Failed to upload attachment";
      res.status(500).json({ message });
    }
  });

  app.get("/api/attachments/file/*splat", async (req, res) => {
    try {
      const storageKey = req.params.splat;
      if (!storageKey) {
        res.status(400).json({ message: "Missing file path" });
        return;
      }

      const decodedKey = storageKey
        .split("/")
        .map((segment) => decodeURIComponent(segment))
        .join("/");

      const file = await readLocalAttachmentFile(decodedKey);
      if (!file) {
        res.status(404).json({ message: "File not found" });
        return;
      }

      res.set({
        "Content-Type": file.mimeType,
        "Content-Length": String(file.buffer.length),
        "Cache-Control": "private, max-age=3600",
      });
      res.send(file.buffer);
    } catch (error) {
      console.error("GET /api/attachments/file failed:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  app.get("/api/attachments/storage-status", (_req, res) => {
    res.json({
      configured: isObjectStorageConfigured(),
      mode: isObjectStorageConfigured() ? "replit" : "local",
    });
  });
}

export async function getAttachmentFileResponse(
  id: string,
  res: Response,
): Promise<boolean> {
  const attachment = await getAttachmentById(id);
  if (!attachment) return false;

  if (attachment.storageKey.startsWith("/objects/")) {
    return false;
  }

  const file = await readLocalAttachmentFile(attachment.storageKey);
  if (!file) return false;

  res.set({
    "Content-Type": file.mimeType,
    "Content-Length": String(file.buffer.length),
    "Cache-Control": "private, max-age=3600",
  });
  res.send(file.buffer);
  return true;
}
