import type { ShareEntityType } from "./itemShares";
import type { BoardDisplay } from "./itemShares";

export interface BoardPin {
  id: string;
  householdId: string;
  itemType: ShareEntityType | null;
  itemId: string | null;
  x: number;
  y: number;
  rotation: number;
  pinStyle: string | null;
  contentJson: Record<string, unknown> | null;
  dismissedAt: string | null;
  createdAt: string;
}

export interface CreateBoardPinInput {
  itemType: ShareEntityType;
  itemId: string;
  x?: number;
  y?: number;
  rotation?: number;
  pinStyle?: string;
}

export interface UpdateBoardPinPositionInput {
  x: number;
  y: number;
  rotation?: number;
}

export interface SharedBoardItem {
  itemType: ShareEntityType;
  itemId: string;
  title: string;
  subtitle?: string;
  colour: string;
  boardDisplay: BoardDisplay;
  dateLabel?: string;
  photoUrl?: string;
}
