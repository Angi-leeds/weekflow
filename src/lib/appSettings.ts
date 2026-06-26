import type {
  CalendarPreferences,
  CalendarViewMode,
  DiaryTasksMode,
  IntegrationAccountDefaults,
  IntegrationPreferences,
  ItemDisplayOptions,
  ItemDisplayPreset,
  ItemTitleSize,
  ListDisplayOptions,
  TimeFormat,
  TodayHighlightOptions,
  TodayHighlightPreset,
} from "../types";
import {
  DEFAULT_CALENDAR_PREFERENCES,
  DEFAULT_INTEGRATION_ACCOUNT_DEFAULTS,
  DEFAULT_INTEGRATION_PREFERENCES,
  DEFAULT_ITEM_DISPLAY,
  DEFAULT_LIST_OPTIONS,
  DEFAULT_TODAY_HIGHLIGHT,
  ITEM_TITLE_SIZE_OPTIONS,
  TODAY_HIGHLIGHT_PRESETS,
} from "../types";

const CALENDAR_PREFS_KEY = "weekflow-calendar-preferences";
const LIST_OPTIONS_KEY = "weekflow-list-options";
const ITEM_DISPLAY_KEY = "weekflow-item-display";
const TODAY_HIGHLIGHT_KEY = "weekflow-today-highlight";
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
      monthViewExpandWeeks: parsed.monthViewExpandWeeks === true,
      weekViewAnchor: parsed.weekViewAnchor === 'today' ? 'today' : 'week-start',
      diaryTasksMode: isDiaryTasksMode(parsed.diaryTasksMode)
        ? parsed.diaryTasksMode
        : DEFAULT_CALENDAR_PREFERENCES.diaryTasksMode,
      showWeekNumber: parsed.showWeekNumber === true,
      showDayOfYear: parsed.showDayOfYear === true,
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
      titleSize: isItemTitleSize(parsed.titleSize) ? parsed.titleSize : DEFAULT_ITEM_DISPLAY.titleSize,
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

export function loadTodayHighlightOptions(): TodayHighlightOptions {
  try {
    const raw = localStorage.getItem(TODAY_HIGHLIGHT_KEY);
    if (!raw) return { ...DEFAULT_TODAY_HIGHLIGHT };
    const parsed = JSON.parse(raw) as Partial<TodayHighlightOptions>;
    const preset = isTodayHighlightPreset(parsed.preset) ? parsed.preset : DEFAULT_TODAY_HIGHLIGHT.preset;
    const presetDefaults =
      preset !== "custom" ? TODAY_HIGHLIGHT_PRESETS[preset] : {};
    return {
      preset,
      accentColor:
        typeof parsed.accentColor === "string" && parsed.accentColor.startsWith("#")
          ? parsed.accentColor
          : DEFAULT_TODAY_HIGHLIGHT.accentColor,
      backgroundMode: isTodayBackgroundMode(parsed.backgroundMode)
        ? parsed.backgroundMode
        : presetDefaults.backgroundMode ?? DEFAULT_TODAY_HIGHLIGHT.backgroundMode,
      backgroundOpacity:
        typeof parsed.backgroundOpacity === "number"
          ? Math.min(100, Math.max(10, parsed.backgroundOpacity))
          : presetDefaults.backgroundOpacity ?? DEFAULT_TODAY_HIGHLIGHT.backgroundOpacity,
      borderMode: isTodayBorderMode(parsed.borderMode)
        ? parsed.borderMode
        : presetDefaults.borderMode ?? DEFAULT_TODAY_HIGHLIGHT.borderMode,
      borderWidth: parsed.borderWidth === 1 || parsed.borderWidth === 3 || parsed.borderWidth === 4
        ? parsed.borderWidth
        : presetDefaults.borderWidth ?? DEFAULT_TODAY_HIGHLIGHT.borderWidth,
      dateStyle: isTodayDateStyle(parsed.dateStyle)
        ? parsed.dateStyle
        : presetDefaults.dateStyle ?? DEFAULT_TODAY_HIGHLIGHT.dateStyle,
      pulse: isTodayPulseMode(parsed.pulse)
        ? parsed.pulse
        : presetDefaults.pulse ?? DEFAULT_TODAY_HIGHLIGHT.pulse,
      badge: isTodayBadgeMode(parsed.badge)
        ? parsed.badge
        : presetDefaults.badge ?? DEFAULT_TODAY_HIGHLIGHT.badge,
      tintColumn: true,
      tintMonthCell: true,
      showWeekdayAccent:
        typeof parsed.showWeekdayAccent === "boolean"
          ? parsed.showWeekdayAccent
          : presetDefaults.showWeekdayAccent ?? DEFAULT_TODAY_HIGHLIGHT.showWeekdayAccent,
    };
  } catch {
    return { ...DEFAULT_TODAY_HIGHLIGHT };
  }
}

export function saveTodayHighlightOptions(options: TodayHighlightOptions): void {
  localStorage.setItem(TODAY_HIGHLIGHT_KEY, JSON.stringify(options));
}

function isTodayHighlightPreset(value: unknown): value is TodayHighlightPreset {
  return typeof value === "string" && (value in TODAY_HIGHLIGHT_PRESETS || value === "custom");
}

function isTodayBackgroundMode(value: unknown): value is TodayHighlightOptions["backgroundMode"] {
  return value === "none" || value === "soft" || value === "strong" || value === "solid";
}

function isTodayBorderMode(value: unknown): value is TodayHighlightOptions["borderMode"] {
  return (
    value === "none" ||
    value === "ring" ||
    value === "full" ||
    value === "left-bar" ||
    value === "dashed" ||
    value === "double"
  );
}

function isTodayDateStyle(value: unknown): value is TodayHighlightOptions["dateStyle"] {
  return (
    value === "default" ||
    value === "accent-text" ||
    value === "filled-circle" ||
    value === "filled-pill" ||
    value === "outlined-circle" ||
    value === "scaled"
  );
}

function isTodayPulseMode(value: unknown): value is TodayHighlightOptions["pulse"] {
  return value === "off" || value === "soft" || value === "strong" || value === "glow";
}

function isTodayBadgeMode(value: unknown): value is TodayHighlightOptions["badge"] {
  return value === "none" || value === "pill" || value === "dot" || value === "label" || value === "corner";
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

function isItemTitleSize(value: unknown): value is ItemTitleSize {
  return typeof value === "string" && ITEM_TITLE_SIZE_OPTIONS.includes(value as ItemTitleSize);
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

function isDiaryTasksMode(value: unknown): value is DiaryTasksMode {
  return (
    value === "category-rules" ||
    value === "hide-all-tasks" ||
    value === "show-all-dated"
  );
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
