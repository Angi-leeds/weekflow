/** Outlook master category colour presets (Graph stores preset names, not hex). */
export type OutlookCategoryPreset =
  | "none"
  | "preset0"
  | "preset1"
  | "preset2"
  | "preset3"
  | "preset4"
  | "preset5"
  | "preset6"
  | "preset7"
  | "preset8"
  | "preset9"
  | "preset10"
  | "preset11"
  | "preset12"
  | "preset13"
  | "preset14"
  | "preset15"
  | "preset16"
  | "preset17"
  | "preset18"
  | "preset19"
  | "preset20"
  | "preset21"
  | "preset22"
  | "preset23"
  | "preset24";

/** Approximate Outlook desktop hex values per Microsoft preset table. */
export const OUTLOOK_PRESET_HEX: Record<OutlookCategoryPreset, string> = {
  none: "#8E8E93",
  preset0: "#E74856",
  preset1: "#FF8C00",
  preset2: "#AF7043",
  preset3: "#FFAB00",
  preset4: "#6BB700",
  preset5: "#038387",
  preset6: "#7F8034",
  preset7: "#0078D4",
  preset8: "#8764B8",
  preset9: "#CA5010",
  preset10: "#4F6BED",
  preset11: "#0078D4",
  preset12: "#69797E",
  preset13: "#647C64",
  preset14: "#881798",
  preset15: "#6B0000",
  preset16: "#803000",
  preset17: "#563D0C",
  preset18: "#666620",
  preset19: "#0F6C00",
  preset20: "#005E60",
  preset21: "#294903",
  preset22: "#000080",
  preset23: "#330066",
  preset24: "#620042",
};

export const OUTLOOK_PRESET_OPTIONS: OutlookCategoryPreset[] = [
  "preset0",
  "preset1",
  "preset2",
  "preset3",
  "preset4",
  "preset5",
  "preset6",
  "preset7",
  "preset8",
  "preset9",
  "preset10",
  "preset11",
  "preset12",
  "preset13",
  "preset14",
  "preset15",
  "preset16",
  "preset17",
  "preset18",
  "preset19",
  "preset20",
  "preset21",
  "preset22",
  "preset23",
  "preset24",
];

export const OUTLOOK_ORPHAN_CATEGORY_HEX = "#8E8E93";

export function normalizeOutlookPreset(value?: string | null): OutlookCategoryPreset {
  if (!value) return "none";
  const key = value.toLowerCase() as OutlookCategoryPreset;
  if (key in OUTLOOK_PRESET_HEX) return key;
  return "none";
}

export function outlookPresetToHex(preset?: string | null): string {
  return OUTLOOK_PRESET_HEX[normalizeOutlookPreset(preset)];
}

export function hexToOutlookPreset(hex: string): OutlookCategoryPreset {
  const normalized = hex.trim().toLowerCase();
  let best: OutlookCategoryPreset = "preset7";
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const preset of OUTLOOK_PRESET_OPTIONS) {
    const candidate = OUTLOOK_PRESET_HEX[preset].toLowerCase();
    const distance = colourDistance(normalized, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = preset;
    }
  }
  return best;
}

function colourDistance(a: string, b: string): number {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    if (h.length !== 6) return [0, 0, 0];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  return (ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2;
}
