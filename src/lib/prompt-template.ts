/**
 * Prompt 模板的覆寫機制。
 *
 * 設計原則:**內建模板留在 code 裡當 fallback,不搬進 store 當初始資料。**
 * 這樣沒改過的使用者行為完全不變、內建模板能隨版本更新生效、改壞了也能還原。
 *
 * 只模板化結構單純的那幾個。`buildVeoPrompt` / `buildGridPrompt` 有大量條件
 * 分支(單鏡與多鏡走不同句式、靜音、運鏡對照),硬塞進平面模板只會變得比
 * 現在更難改 —— 那些留在程式裡。
 */

export const PROMPT_TEMPLATE_IDS = [
  "image",
  "character-sheet",
  "presenter-sheet",
] as const;

export type PromptTemplateId = (typeof PROMPT_TEMPLATE_IDS)[number];

export interface TemplateMeta {
  id: PromptTemplateId;
  label: string;
  description: string;
  /** 可用變數,顯示在 UI —— 不列出來使用者不知道能填什麼 */
  variables: string[];
  builtIn: string;
}

/**
 * 內建模板。**這些字串必須與改用模板前的輸出逐字相同**,
 * 否則既有專案重生的圖會與舊圖不一致(有單元測試把這件事釘住)。
 */
export const TEMPLATE_META: Record<PromptTemplateId, TemplateMeta> = {
  image: {
    id: "image",
    label: "生圖 Prompt",
    description: "每次生分鏡圖都會用到。三段之間是空行。",
    variables: ["prompt", "lens", "lighting"],
    builtIn: [
      "{{prompt}}",
      "{{lens}}. {{lighting}}.",
      "Do not include any text, words, subtitles, captions, labels, watermarks, or speech bubbles anywhere in the image. Pure visual only.",
    ].join("\n\n"),
  },
  "character-sheet": {
    id: "character-sheet",
    label: "角色設定圖(三視圖)",
    description: "人物資產按「角色設定」時使用,產生 turnaround 參考圖。",
    variables: ["appearance"],
    builtIn: [
      "Character reference sheet (turnaround) of ONE single consistent character.",
      "Character: {{appearance}}.",
      "Show the SAME character in three views side by side on a clean neutral light-gray studio background: front view, 3/4 view, and side profile. Full body, standing in a relaxed neutral pose.",
      "Keep the face, hairstyle, body proportions, and outfit IDENTICAL across all three views. Even soft studio lighting, no harsh shadows.",
      "Do not include any text, labels, watermarks, measurement lines, grids, or color swatches. Pure clean character turnaround only.",
    ].join("\n"),
  },
  "presenter-sheet": {
    id: "presenter-sheet",
    label: "數字人主播肖像",
    description: "資產類型為「數字人主播」時改用這個,產生正面上半身像。",
    variables: ["appearance"],
    builtIn: [
      "Professional upper-body portrait of a single friendly presenter, facing the camera with a warm confident expression.",
      "Character: {{appearance}}.",
      "Clean neutral studio background, even soft key lighting, sharp focus on the face, natural skin tones.",
      "Do not include any text, labels, watermarks, logos, or graphics. Pure clean portrait only.",
    ].join("\n"),
  },
};

/**
 * 平面替換 `{{key}}`。
 *
 * 未知變數**原樣保留**而不是替換成空字串 —— 使用者打錯變數名時要能從輸出
 * 看出來,靜默變成空字串只會讓人以為模板壞了。
 */
export function renderTemplate(
  body: string,
  vars: Record<string, string>
): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in vars ? vars[key] : match
  );
}

/** 取生效的模板:覆寫優先,沒有則用內建 */
export function resolveTemplate(
  id: PromptTemplateId,
  overrides: Partial<Record<PromptTemplateId, string>> = {}
): string {
  const override = overrides[id];
  return override?.trim() ? override : TEMPLATE_META[id].builtIn;
}
