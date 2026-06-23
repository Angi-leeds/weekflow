import type { ItemShare, ShareEntityType, UpsertItemShareInput } from "../../shared/itemShares";
import { DEMO_SHARED_BY } from "../../shared/itemShares";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";

const STORAGE_KEY = "weekflow-item-shares";

function readLocalShares(): ItemShare[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ItemShare[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalShares(shares: ItemShare[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shares));
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

export async function fetchAllItemShares(): Promise<ItemShare[]> {
  try {
    const shares = await apiFetch<ItemShare[]>("/api/item-shares");
    writeLocalShares(shares);
    return shares;
  } catch {
    return readLocalShares();
  }
}

export async function upsertItemShare(input: UpsertItemShareInput): Promise<ItemShare> {
  try {
    const share = await apiFetch<ItemShare>("/api/item-shares", {
      method: "PUT",
      body: JSON.stringify(input),
    });
    const local = readLocalShares();
    writeLocalShares([
      ...local.filter(
        (entry) => !(entry.itemType === share.itemType && entry.itemId === share.itemId),
      ),
      share,
    ]);
    return share;
  } catch {
    const fallback: ItemShare = {
      id: crypto.randomUUID(),
      householdId: DEMO_HOUSEHOLD_ID,
      itemType: input.itemType,
      itemId: input.itemId,
      sharedToBoard: input.sharedToBoard,
      boardDisplay: input.boardDisplay ?? "title_only",
      sharedBy: input.sharedBy ?? DEMO_SHARED_BY,
      createdAt: new Date().toISOString(),
    };
    const local = readLocalShares();
    writeLocalShares([
      ...local.filter(
        (entry) => !(entry.itemType === fallback.itemType && entry.itemId === fallback.itemId),
      ),
      fallback,
    ]);
    return fallback;
  }
}

export function getShareForEntity(
  shares: ItemShare[],
  itemType: ShareEntityType,
  itemId: string,
): ItemShare | undefined {
  return shares.find((share) => share.itemType === itemType && share.itemId === itemId);
}
