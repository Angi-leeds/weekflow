export type CategoryRecurrenceKind =
  | "none"
  | "yearly"
  | "monthly"
  | "monthlyLastDay"
  | "intervalDays";

export interface CategoryAutomationRecurrence {
  kind: CategoryRecurrenceKind;
  /** For intervalDays — e.g. 30 for pay-day cycles. */
  intervalDays?: number;
}

export interface CategoryAutomation {
  enabled: boolean;
  keywords: string[];
  matchInNotes?: boolean;
  /** Event alert N days before start. */
  reminderLeadDays?: number;
  recurrence?: CategoryAutomationRecurrence;
}

export const DEFAULT_CATEGORY_AUTOMATION: CategoryAutomation = {
  enabled: false,
  keywords: [],
  matchInNotes: false,
};

export type CategoryAutomationMap = Record<string, CategoryAutomation>;
