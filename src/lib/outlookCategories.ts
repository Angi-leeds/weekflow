import type { OutlookCategoryDto } from "../../shared/microsoftGraph";
import {
  hexToOutlookPreset,
  outlookPresetToHex,
  type OutlookCategoryPreset,
} from "../../shared/outlookCategoryColors";
import type { Category } from "../types";

export const OUTLOOK_CATEGORY_ID_PREFIX = "outlook-";

export function isOutlookCategoryId(id: string): boolean {
  return id.startsWith(OUTLOOK_CATEGORY_ID_PREFIX);
}

export function outlookGraphIdFromCategoryId(categoryId: string): string | null {
  if (!isOutlookCategoryId(categoryId)) return null;
  return categoryId.slice(OUTLOOK_CATEGORY_ID_PREFIX.length);
}

export function outlookCategoryToWeekflowCategory(dto: OutlookCategoryDto): Category {
  const preset = (dto.color ?? "preset7") as OutlookCategoryPreset;
  return {
    id: `${OUTLOOK_CATEGORY_ID_PREFIX}${dto.id}`,
    name: dto.displayName,
    colour: outlookPresetToHex(preset),
    kind: "event",
    outlookPreset: preset,
    outlookGraphId: dto.id,
  };
}

export function outlookCategoriesToWeekflowCategories(dtos: OutlookCategoryDto[]): Category[] {
  return dtos.map(outlookCategoryToWeekflowCategory);
}

export function weekflowCategoryToOutlookPreset(category: Pick<Category, "colour" | "outlookPreset">): string {
  if (category.outlookPreset) return category.outlookPreset;
  return hexToOutlookPreset(category.colour);
}

export function outlookCategoryNamesForItem(
  item: { categoryId: string; outlookCategories?: string[] },
  categories: Category[],
): string[] {
  if (item.outlookCategories?.length) return item.outlookCategories;
  const match = categories.find((entry) => entry.id === item.categoryId);
  if (match?.name) return [match.name];
  return [];
}

export function resolveCategoryDisplayName(categories: Category[], categoryId: string): string {
  return categories.find((entry) => entry.id === categoryId)?.name ?? "Uncategorized";
}
