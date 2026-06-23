import type { CreateLinkInput, EntityType, ItemLink } from "../../shared/links";

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

export function toEntityKey(type: EntityType, id: string): string {
  return `${type}\u001f${id}`;
}

export function fromEntityKey(key: string): { type: EntityType; id: string } {
  const separator = key.indexOf("\u001f");
  return {
    type: key.slice(0, separator) as EntityType,
    id: key.slice(separator + 1),
  };
}

export interface RelatedEntityRef {
  type: EntityType;
  id: string;
  hops: number;
  directLink?: ItemLink;
}

/** All entities in the same link cluster as the given entity (excluding itself). */
export function getConnectedRelatedEntities(
  allLinks: ItemLink[],
  entityType: EntityType,
  entityId: string,
): RelatedEntityRef[] {
  const startKey = toEntityKey(entityType, entityId);
  const adjacency = new Map<string, Set<string>>();

  for (const link of allLinks) {
    const fromKey = toEntityKey(link.fromType, link.fromId);
    const toKey = toEntityKey(link.toType, link.toId);

    if (!adjacency.has(fromKey)) adjacency.set(fromKey, new Set());
    if (!adjacency.has(toKey)) adjacency.set(toKey, new Set());

    adjacency.get(fromKey)!.add(toKey);
    adjacency.get(toKey)!.add(fromKey);
  }

  const hopsFromStart = new Map<string, number>();
  const queue: string[] = [startKey];
  hopsFromStart.set(startKey, 0);

  while (queue.length > 0) {
    const key = queue.shift()!;
    const hops = hopsFromStart.get(key) ?? 0;

    for (const neighbor of adjacency.get(key) ?? []) {
      if (!hopsFromStart.has(neighbor)) {
        hopsFromStart.set(neighbor, hops + 1);
        queue.push(neighbor);
      }
    }
  }

  const directLinks = getLinksForEntity(allLinks, entityType, entityId);
  const directByKey = new Map<string, ItemLink>();
  for (const link of directLinks) {
    const other = getOtherEnd(link, entityType, entityId);
    directByKey.set(toEntityKey(other.type as EntityType, other.id), link);
  }

  const related: RelatedEntityRef[] = [];
  for (const [key, hops] of hopsFromStart) {
    if (key === startKey) continue;
    const { type, id } = fromEntityKey(key);
    related.push({
      type,
      id,
      hops,
      directLink: directByKey.get(key),
    });
  }

  related.sort((a, b) => a.hops - b.hops || a.type.localeCompare(b.type));
  return related;
}

export function isInSameLinkCluster(
  allLinks: ItemLink[],
  aType: EntityType,
  aId: string,
  bType: EntityType,
  bId: string,
): boolean {
  if (aType === bType && aId === bId) return true;
  return getConnectedRelatedEntities(allLinks, aType, aId).some(
    (entity) => entity.type === bType && entity.id === bId,
  );
}
