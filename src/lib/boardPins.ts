import type {
  BoardPin,
  CreateBoardPinInput,
  CreateVoicePinInput,
  UpdateBoardPinInput,
  UpdateBoardPinPositionInput,
} from "../../shared/boardPins";
import type { VoicePinContent } from "../../shared/boardLayout";
import { DEMO_HOUSEHOLD_ID } from "../../shared/links";

const STORAGE_KEY = "weekflow-board-pins";

function readLocalPins(): BoardPin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BoardPin[];
    return Array.isArray(parsed) ? parsed.filter((pin) => !pin.dismissedAt) : [];
  } catch {
    return [];
  }
}

function writeLocalPins(pins: BoardPin[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
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

export async function fetchAllBoardPins(): Promise<BoardPin[]> {
  try {
    const pins = await apiFetch<BoardPin[]>("/api/board-pins");
    writeLocalPins(pins);
    return pins;
  } catch {
    return readLocalPins();
  }
}

export async function createBoardPin(input: CreateBoardPinInput): Promise<BoardPin> {
  try {
    const pin = await apiFetch<BoardPin>("/api/board-pins", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const local = readLocalPins();
    writeLocalPins([...local.filter((entry) => entry.id !== pin.id), pin]);
    return pin;
  } catch {
    const local = readLocalPins();
    const existing = local.find(
      (entry) => entry.itemType === input.itemType && entry.itemId === input.itemId,
    );
    if (existing) return existing;

    const fallback: BoardPin = {
      id: crypto.randomUUID(),
      householdId: DEMO_HOUSEHOLD_ID,
      itemType: input.itemType,
      itemId: input.itemId,
      x: input.x ?? Math.random() * 60 + 10,
      y: input.y ?? Math.random() * 50 + 15,
      rotation: input.rotation ?? (Math.random() - 0.5) * 8,
      pinStyle: input.pinStyle ?? null,
      contentJson: null,
      dismissedAt: null,
      createdAt: new Date().toISOString(),
    };
    writeLocalPins([...local, fallback]);
    return fallback;
  }
}

export async function updateBoardPinPosition(
  id: string,
  input: UpdateBoardPinPositionInput,
): Promise<BoardPin> {
  return updateBoardPin(id, input);
}

export async function updateBoardPin(id: string, input: UpdateBoardPinInput): Promise<BoardPin> {
  try {
    const pin = await apiFetch<BoardPin>(`/api/board-pins/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    const local = readLocalPins();
    writeLocalPins(local.map((entry) => (entry.id === pin.id ? pin : entry)));
    return pin;
  } catch {
    const local = readLocalPins();
    const idx = local.findIndex((entry) => entry.id === id);
    if (idx < 0) throw new Error("Board pin not found");

    const updated: BoardPin = {
      ...local[idx],
      ...input,
      x: input.x ?? local[idx].x,
      y: input.y ?? local[idx].y,
      rotation: input.rotation ?? local[idx].rotation,
      pinStyle: input.pinStyle === undefined ? local[idx].pinStyle : input.pinStyle,
      contentJson:
        input.contentJson === undefined ? local[idx].contentJson : input.contentJson,
      dismissedAt:
        input.dismissedAt === undefined ? local[idx].dismissedAt : input.dismissedAt,
    };
    const next = [...local];
    next[idx] = updated;
    writeLocalPins(next);
    return updated;
  }
}

export async function createVoicePin(input: CreateVoicePinInput): Promise<BoardPin> {
  try {
    const pin = await apiFetch<BoardPin>("/api/board-pins/voice", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const local = readLocalPins();
    writeLocalPins([...local, pin]);
    return pin;
  } catch {
    const contentJson: VoicePinContent = {
      kind: "voice",
      message: input.message,
      from: input.from ?? "Mum",
      durationSec: Math.max(3, Math.round(input.message.length / 8)),
      played: false,
      replies: [],
    };
    const fallback: BoardPin = {
      id: crypto.randomUUID(),
      householdId: DEMO_HOUSEHOLD_ID,
      itemType: null,
      itemId: null,
      x: Math.random() * 60 + 20,
      y: Math.random() * 50 + 20,
      rotation: 0,
      pinStyle: input.pinStyle ?? "🎙️",
      contentJson,
      dismissedAt: null,
      createdAt: new Date().toISOString(),
    };
    writeLocalPins([...readLocalPins(), fallback]);
    return fallback;
  }
}

export function getPinForItem(
  pins: BoardPin[],
  itemType: string,
  itemId: string,
): BoardPin | undefined {
  return pins.find((pin) => pin.itemType === itemType && pin.itemId === itemId);
}
