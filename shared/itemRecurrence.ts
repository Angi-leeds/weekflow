export type ItemRecurrenceKind =
  | "yearly"
  | "monthly"
  | "monthlyLastDay"
  | "intervalDays"
  | "weekly";

export interface ItemRecurrence {
  kind: ItemRecurrenceKind;
  /** For intervalDays kind. */
  intervalDays?: number;
  /** For weekly kind (default 1). */
  interval?: number;
  count?: number | null;
  until?: string | null;
}

export const ITEM_RECURRENCE_KIND_LABELS: Record<ItemRecurrenceKind, string> = {
  yearly: "Yearly",
  monthly: "Monthly (same date)",
  monthlyLastDay: "Monthly (last day)",
  intervalDays: "Every N days",
  weekly: "Weekly",
};

export const CATEGORY_RECURRENCE_KIND_LABELS: Record<
  import("./categoryAutomation").CategoryRecurrenceKind,
  string
> = {
  none: "None",
  yearly: "Yearly (e.g. birthdays)",
  monthly: "Monthly (same date)",
  monthlyLastDay: "Monthly (last day)",
  intervalDays: "Every N days",
};

export function recurrenceFromLegacyWeekly(
  recurringWeekly?: boolean,
): ItemRecurrence | undefined {
  if (!recurringWeekly) return undefined;
  return { kind: "weekly", interval: 1, count: 10 };
}

export function categoryRecurrenceToItemRecurrence(
  recurrence?: import("./categoryAutomation").CategoryAutomationRecurrence,
): ItemRecurrence | undefined {
  if (!recurrence || recurrence.kind === "none") return undefined;
  if (recurrence.kind === "intervalDays") {
    const days = recurrence.intervalDays ?? 30;
    return { kind: "intervalDays", intervalDays: days };
  }
  return { kind: recurrence.kind };
}
