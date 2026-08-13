import { modelOptions } from "./seedance-options";
import { DEFAULT_VIDEO_MODEL, VIDEO_MODELS } from "./video";
import type { CustomModel } from "./schemas";

/**
 * 模型的內建預設與「覆寫優先」解析。
 *
 * 設計原則:store 存空字串代表「用內建預設」。這樣沒設定過的使用者行為
 * 完全不變,內建預設也能隨版本更新生效(不會被舊的初始化資料鎖住)。
 */

export const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

export interface ModelOption {
  value: string;
  label: string;
}

/** 生效的生圖模型:使用者覆寫優先,否則內建預設 */
export function resolveImageModel(override: string): string {
  return override.trim() || DEFAULT_IMAGE_MODEL;
}

/** 生效的生影片模型:使用者覆寫優先,否則內建預設 */
export function resolveVideoModel(override: string): string {
  return override.trim() || DEFAULT_VIDEO_MODEL;
}

/** 內建 + 自訂合併的生圖模型下拉選項;自訂的標籤加註記以便區分 */
export function imageModelOptions(custom: CustomModel[]): ModelOption[] {
  const builtIn: ModelOption[] = modelOptions.map((o) => ({
    value: o.value,
    label: o.label,
  }));
  const builtInIds = new Set(builtIn.map((o) => o.value));

  const extra = custom
    .filter((m) => !builtInIds.has(m.id))
    .map((m) => ({ value: m.id, label: `${m.label}（自訂）` }));

  return [...builtIn, ...extra];
}

export function videoModelOptions(): ModelOption[] {
  return VIDEO_MODELS.map((m) => ({ value: m.model, label: m.label }));
}
