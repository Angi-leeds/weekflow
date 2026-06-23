import type { Attachment, AttachmentEntityType, AttachmentKind } from "../../shared/attachments";

const STORAGE_KEY = "weekflow-attachments";

function readLocalAttachments(): Attachment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Attachment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAttachments(attachments: Attachment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attachments));
}

export async function fetchAllAttachments(): Promise<Attachment[]> {
  try {
    const attachments = await fetch("/api/attachments").then(async (response) => {
      if (!response.ok) throw new Error("Failed to load attachments");
      return response.json() as Promise<Attachment[]>;
    });
    writeLocalAttachments(attachments);
    return attachments;
  } catch {
    return readLocalAttachments();
  }
}

export async function uploadAttachment(
  file: File,
  itemType: AttachmentEntityType,
  itemId: string,
  kind: AttachmentKind = "photo",
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("itemType", itemType);
  formData.append("itemId", itemId);
  formData.append("kind", kind);

  try {
    const response = await fetch("/api/attachments", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message ?? `Upload failed (${response.status})`);
    }

    const attachment = (await response.json()) as Attachment;
    const local = readLocalAttachments();
    writeLocalAttachments([
      ...local.filter(
        (entry) =>
          !(
            entry.itemType === attachment.itemType &&
            entry.itemId === attachment.itemId &&
            entry.kind === attachment.kind
          ),
      ),
      attachment,
    ]);
    return attachment;
  } catch {
    const fallbackUrl = await readFileAsDataUrl(file);
    const fallback: Attachment = {
      id: crypto.randomUUID(),
      householdId: "00000000-0000-0000-0000-000000000001",
      itemType,
      itemId,
      storageKey: `local://${itemType}/${itemId}/${file.name}`,
      mimeType: file.type || "image/jpeg",
      filename: file.name,
      kind,
      url: fallbackUrl,
      createdAt: new Date().toISOString(),
    };
    const local = readLocalAttachments();
    writeLocalAttachments([
      ...local.filter(
        (entry) =>
          !(
            entry.itemType === itemType &&
            entry.itemId === itemId &&
            entry.kind === kind
          ),
      ),
      fallback,
    ]);
    return fallback;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function getPhotoForItem(
  attachmentList: Attachment[],
  itemType: AttachmentEntityType,
  itemId: string,
): Attachment | undefined {
  return attachmentList.find(
    (entry) =>
      entry.itemType === itemType && entry.itemId === itemId && entry.kind === "photo",
  );
}

export function getPhotoUrlForItem(
  attachmentList: Attachment[],
  itemType: AttachmentEntityType,
  itemId: string,
): string | undefined {
  return getPhotoForItem(attachmentList, itemType, itemId)?.url;
}
