import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { objectStorageClient } from "../replit_integrations/object_storage/objectStorage";

const LOCAL_DIR = path.resolve(
  process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), ".local-object-storage"),
);

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID && process.env.PRIVATE_OBJECT_DIR,
  );
}

function parseObjectPath(objectPath: string): { bucketName: string; objectName: string } {
  const normalized = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;
  const parts = normalized.split("/");
  if (parts.length < 3) {
    throw new Error("Invalid object path");
  }
  return {
    bucketName: parts[1],
    objectName: parts.slice(2).join("/"),
  };
}

function localPathFor(storageKey: string): string {
  const segments = storageKey.split("/").filter((part) => part && part !== ".." && part !== ".");
  return path.join(LOCAL_DIR, ...segments);
}

export async function uploadAttachmentFile(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<{ storageKey: string; url: string }> {
  const ext = path.extname(filename) || "";
  const objectId = randomUUID();

  if (isObjectStorageConfigured()) {
    const privateDir = process.env.PRIVATE_OBJECT_DIR!;
    const prefix = privateDir.endsWith("/") ? privateDir : `${privateDir}/`;
    const entityPath = `${prefix}attachments/${objectId}${ext}`;
    const { bucketName, objectName } = parseObjectPath(entityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          originalFilename: filename,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    const storageKey = `/objects/attachments/${objectId}${ext}`;
    return { storageKey, url: storageKey };
  }

  const storageKey = `attachments/${objectId}${ext}`;
  const filePath = localPathFor(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);

  return {
    storageKey,
    url: `/api/attachments/file/${storageKey.split("/").map(encodeURIComponent).join("/")}`,
  };
}

export async function readLocalAttachmentFile(
  storageKey: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const filePath = localPathFor(storageKey);
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(storageKey).toLowerCase();
    const mimeType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : "image/jpeg";
    return { buffer, mimeType };
  } catch {
    return null;
  }
}

export function attachmentPublicUrl(storageKey: string): string {
  if (storageKey.startsWith("/objects/")) {
    return storageKey;
  }
  return `/api/attachments/file/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}
