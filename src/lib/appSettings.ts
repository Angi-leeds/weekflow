import type {
  CalendarPreferences,
  CalendarViewMode,
  IntegrationAccountDefaults,
  IntegrationPreferences,
  ItemDisplayOptions,
  ItemDisplayPreset,
  ListDisplayOptions,
  TimeFormat,
} from "../types";
import {
  DEFAULT_CALENDAR_PREFERENCES,
  DEFAULT_INTEGRATION_ACCOUNT_DEFAULTS,
  DEFAULT_INTEGRATION_PREFERENCES,
  DEFAULT_ITEM_DISPLAY,
  DEFAULT_LIST_OPTIONS,
} from "../types";

const CALENDAR_PREFS_KEY = "weekflow-calendar-preferences";
const LIST_OPTIONS_KEY = "weekflow-list-options";
const ITEM_DISPLAY_KEY = "weekflow-item-display";
const INTEGRATION_PREFS_KEY = "weekflow-integration-preferences";
const INTEGRATION_DEFAULTS_KEY = "weekflow-integration-account-defaults";
const SETTINGS_PANEL_KEY = "weekflow-settings-panel";

export interface SettingsPanelPreferences {
  expanded: boolean;
}

export function loadSettingsPanelPreferences(): SettingsPanelPreferences {
  try {
    const raw = localStorage.getItem(SETTINGS_PANEL_KEY);
    if (!raw) return { expanded: true };
    const parsed = JSON.parse(raw) as Partial<SettingsPanelPreferences>;
    return { expanded: parsed.expanded !== false };
  } catch {
    return { expanded: true };
  }
}

export function saveSettingsPanelPreferences(prefs: SettingsPanelPreferences): void {
  localStorage.setItem(SETTINGS_PANEL_KEY, JSON.stringify(prefs));
}

let activeTimeFormat: TimeFormat = DEFAULT_CALENDAR_PREFERENCES.timeFormat;

export function getTimeFormat(): TimeFormat {
  return activeTimeFormat;
}

export function applyTimeFormat(format: TimeFormat): void {
  activeTimeFormat = format;
}

export function loadCalendarPreferences(): CalendarPreferences {
  try {
    const raw = localStorage.getItem(CALENDAR_PREFS_KEY);
    if (!raw) return { ...DEFAULT_CALENDAR_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<CalendarPreferences>;
    const prefs: CalendarPreferences = {
      defaultView: isCalendarViewMode(parsed.defaultView)
        ? parsed.defaultView
        : DEFAULT_CALENDAR_PREFERENCES.defaultView,
      weekStartsOn: parsed.weekStartsOn === 0 ? 0 : 1,
      timeFormat: parsed.timeFormat === "12h" ? "12h" : "24h",
    };
    applyTimeFormat(prefs.timeFormat);
    return prefs;
  } catch {
    return { ...DEFAULT_CALENDAR_PREFERENCES };
  }
}

export function saveCalendarPreferences(prefs: CalendarPreferences): void {
  applyTimeFormat(prefs.timeFormat);
  localStorage.setItem(CALENDAR_PREFS_KEY, JSON.stringify(prefs));
}

export function loadListOptions(): ListDisplayOptions {
  try {
    const raw = localStorage.getItem(LIST_OPTIONS_KEY);
    if (!raw) return { ...DEFAULT_LIST_OPTIONS };
    const parsed = JSON.parse(raw) as Partial<ListDisplayOptions>;
    return {
      groupBy: parsed.groupBy ?? DEFAULT_LIST_OPTIONS.groupBy,
      sortBy: parsed.sortBy ?? DEFAULT_LIST_OPTIONS.sortBy,
      hideCompleted: parsed.hideCompleted ?? DEFAULT_LIST_OPTIONS.hideCompleted,
      categoryFilter: Array.isArray(parsed.categoryFilter)
        ? parsed.categoryFilter.filter((id) => typeof id === "string")
        : null,
    };
  } catch {
    return { ...DEFAULT_LIST_OPTIONS };
  }
}

export function saveListOptions(options: ListDisplayOptions): void {
  localStorage.setItem(LIST_OPTIONS_KEY, JSON.stringify(options));
}

export function loadItemDisplayOptions(): ItemDisplayOptions {
  try {
    const raw = localStorage.getItem(ITEM_DISPLAY_KEY);
    if (!raw) return { ...DEFAULT_ITEM_DISPLAY };
    const parsed = JSON.parse(raw) as Partial<ItemDisplayOptions>;
    return {
      preset: isItemDisplayPreset(parsed.preset) ? parsed.preset : DEFAULT_ITEM_DISPLAY.preset,
      density: parsed.density ?? DEFAULT_ITEM_DISPLAY.density,
      colorStyle: parsed.colorStyle ?? DEFAULT_ITEM_DISPLAY.colorStyle,
      timePlacement: parsed.timePlacement ?? DEFAULT_ITEM_DISPLAY.timePlacement,
      titleSize: parsed.titleSize ?? DEFAULT_ITEM_DISPLAY.titleSize,
      multiDayAllDayLayout:
        parsed.multiDayAllDayLayout === 'repeat-daily' ? 'repeat-daily' : 'span-bar',
      showCategoryBadge: parsed.showCategoryBadge ?? DEFAULT_ITEM_DISPLAY.showCategoryBadge,
      showNotesPreview: parsed.showNotesPreview ?? DEFAULT_ITEM_DISPLAY.showNotesPreview,
      showTaskAnytimeLabel:
        parsed.showTaskAnytimeLabel ?? DEFAULT_ITEM_DISPLAY.showTaskAnytimeLabel,
      showCompletedStrike: parsed.showCompletedStrike ?? DEFAULT_ITEM_DISPLAY.showCompletedStrike,
      cardShadow: parsed.cardShadow ?? DEFAULT_ITEM_DISPLAY.cardShadow,
      cardBorder: parsed.cardBorder ?? DEFAULT_ITEM_DISPLAY.cardBorder,
    };
  } catch {
    return { ...DEFAULT_ITEM_DISPLAY };
  }
}

export function saveItemDisplayOptions(options: ItemDisplayOptions): void {
  localStorage.setItem(ITEM_DISPLAY_KEY, JSON.stringify(options));
}

function isItemDisplayPreset(value: unknown): value is ItemDisplayPreset {
  return (
    value === "classic" ||
    value === "minimal" ||
    value === "dense" ||
    value === "bold" ||
    value === "custom"
  );
}

export function loadIntegrationPreferences(): IntegrationPreferences {
  try {
    const raw = localStorage.getItem(INTEGRATION_PREFS_KEY);
    if (!raw) return { ...DEFAULT_INTEGRATION_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<IntegrationPreferences>;
    return {
      googleInterest: Boolean(parsed.googleInterest),
      appleInterest: Boolean(parsed.appleInterest),
      notificationsEnabled: Boolean(parsed.notificationsEnabled),
    };
  } catch {
    return { ...DEFAULT_INTEGRATION_PREFERENCES };
  }
}

export function saveIntegrationPreferences(prefs: IntegrationPreferences): void {
  localStorage.setItem(INTEGRATION_PREFS_KEY, JSON.stringify(prefs));
}

export function loadIntegrationAccountDefaults(): IntegrationAccountDefaults {
  try {
    const raw = localStorage.getItem(INTEGRATION_DEFAULTS_KEY);
    if (!raw) return { ...DEFAULT_INTEGRATION_ACCOUNT_DEFAULTS };
    const parsed = JSON.parse(raw) as IntegrationAccountDefaults;
    return {
      ...DEFAULT_INTEGRATION_ACCOUNT_DEFAULTS,
      ...parsed,
      email: { ...parsed.email },
      calendar: { ...parsed.calendar },
      googleCalendar: { ...parsed.googleCalendar },
      googleEmail: { ...parsed.googleEmail },
      notes: { ...parsed.notes },
      tasks: { ...parsed.tasks },
      contacts: { ...parsed.contacts },
    };
  } catch {
    return { ...DEFAULT_INTEGRATION_ACCOUNT_DEFAULTS };
  }
}

export function saveIntegrationAccountDefaults(defaults: IntegrationAccountDefaults): void {
  localStorage.setItem(INTEGRATION_DEFAULTS_KEY, JSON.stringify(defaults));
}

function isCalendarViewMode(value: unknown): value is CalendarViewMode {
  return (
    value === "week-list" ||
    value === "week-board" ||
    value === "week-timeline" ||
    value === "day" ||
    value === "month" ||
    value === "agenda" ||
    value === "year"
  );
}
