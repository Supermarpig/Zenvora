import { modelOptions } from "./seedance-options";
import { DEFAULT_VIDEO_MODEL, VIDEO_MODELS } from "./video";
import type { CustomModel } from "./schemas";

/**
 * 模型的內建預設與「覆寫優先」解析。
 *
 * 設計原則:store 存空字串代表「用內建預設」。這樣沒設定過的使用者行為
 * 完全不變,內建預設也能隨版本更新生效(不會被舊的初始化資料鎖住)。
 */

export interface ModelOption {
  value: string;
  label: string;
}

export const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

/**
 * 本地 Draw Things(A1111 相容 HTTP API)的生圖識別。選這個時 generate-image
 * 走本機 `/sdapi/v1/txt2img`,不碰 Google key、不計 credit。用哪個藝術模型是在
 * Draw Things App 那邊選的(API 用「當下載入的模型」),所以這裡只需一個識別。
 */
export const LOCAL_IMAGE_MODEL = "drawthings-local";

/**
 * 文字模型(生成分鏡、粗剪、拆小說、預審、推寫資產都用它)。
 *
 * 免費層目前只有 flash 系列可用,所以這個設定的實際選擇空間小 ——
 * 留著是為了 Google 改版時不必改六個 server action。
 */
export const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";

export const TEXT_MODEL_OPTIONS: ModelOption[] = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash（免費層可用）" },
  { value: "gemini-3.1-flash", label: "Gemini 3.1 Flash" },
  { value: "gemini-3-pro", label: "Gemini 3 Pro（付費）" },
];

/** 生效的生圖模型:使用者覆寫優先,否則內建預設 */
export function resolveImageModel(override: string): string {
  return override.trim() || DEFAULT_IMAGE_MODEL;
}

/** 生效的文字模型:使用者覆寫優先,否則內建預設 */
export function resolveTextModel(override: string): string {
  return override.trim() || DEFAULT_TEXT_MODEL;
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
