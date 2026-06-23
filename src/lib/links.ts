import type { CreateLinkInput, ItemLink } from "../../shared/links";

const STORAGE_KEY = "weekflow-links";

function readLocalLinks(): ItemLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ItemLink[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalLinks(links: ItemLink[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchAllLinks(): Promise<ItemLink[]> {
  try {
    const links = await apiFetch<ItemLink[]>("/api/links");
    writeLocalLinks(links);
    return links;
  } catch {
    return readLocalLinks();
  }
}

export async function fetchLinksForEntity(
  entityType: string,
  entityId: string,
): Promise<ItemLink[]> {
  try {
    return await apiFetch<ItemLink[]>(`/api/links/for/${entityType}/${entityId}`);
  } catch {
    return readLocalLinks().filter(
      (link) =>
        (link.fromType === entityType && link.fromId === entityId) ||
        (link.toType === entityType && link.toId === entityId),
    );
  }
}

export async function createLink(input: CreateLinkInput): Promise<ItemLink> {
  try {
    const link = await apiFetch<ItemLink>("/api/links", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const local = readLocalLinks();
    writeLocalLinks([...local.filter((item) => item.id !== link.id), link]);
    return link;
  } catch {
    const fallback: ItemLink = {
      id: crypto.randomUUID(),
      householdId: "00000000-0000-0000-0000-000000000001",
      ...input,
      createdAt: new Date().toISOString(),
    };
    writeLocalLinks([...readLocalLinks(), fallback]);
    return fallback;
  }
}

export async function removeLink(id: string): Promise<void> {
  try {
    await apiFetch<void>(`/api/links/${id}`, { method: "DELETE" });
  } catch {
    // fall through to local removal
  }
  writeLocalLinks(readLocalLinks().filter((link) => link.id !== id));
}

export function getLinksForEntity(
  allLinks: ItemLink[],
  entityType: string,
  entityId: string,
): ItemLink[] {
  return allLinks.filter(
    (link) =>
      (link.fromType === entityType && link.fromId === entityId) ||
      (link.toType === entityType && link.toId === entityId),
  );
}

export function getOtherEnd(link: ItemLink, entityType: string, entityId: string) {
  if (link.fromType === entityType && link.fromId === entityId) {
    return { type: link.toType, id: link.toId };
  }
  return { type: link.fromType, id: link.fromId };
}
