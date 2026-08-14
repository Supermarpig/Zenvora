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
  "scene-sheet",
  "prop-sheet",
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
  "scene-sheet": {
    id: "scene-sheet",
    label: "場景參考圖",
    description:
      "資產種類為「場景」時使用。刻意不生 turnaround —— 空間要的是多視角 establishing shots,不是「轉一圈」。",
    variables: ["appearance"],
    builtIn: [
      "Location reference sheet of ONE single consistent place.",
      "Location: {{appearance}}.",
      "Show the SAME location from three different angles side by side: a wide establishing shot, a medium shot from another corner, and a detail shot of a defining feature. Keep the layout, architecture, furniture placement, materials, and lighting setup IDENTICAL across all three.",
      "No people in frame. Even natural lighting that reveals the space clearly.",
      "Do not include any text, labels, watermarks, floor plans, or measurement lines. Pure clean location reference only.",
    ].join("\n"),
  },
  "prop-sheet": {
    id: "prop-sheet",
    label: "道具 / 服裝參考圖",
    description: "資產種類為「道具」或「服裝」時使用,白底多角度產品圖。",
    variables: ["appearance"],
    builtIn: [
      "Product reference sheet of ONE single consistent object.",
      "Object: {{appearance}}.",
      "Show the SAME object from three angles side by side on a clean pure white background: front view, 3/4 view, and a close detail of its material or texture. Keep the shape, proportions, colour, and material IDENTICAL across all three.",
      "Even soft studio lighting, no harsh shadows, no hands or extra props in frame.",
      "Do not include any text, labels, watermarks, or measurement lines. Pure clean product reference only.",
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

// --- 固定句片段(Prompt Fragments)---

/**
 * 影片與宮格 prompt 的**固定句子**開放覆寫。
 *
 * 為什麼不是把整個 prompt 模板化:`buildVeoPrompt` / `buildGridPrompt` 的
 * 條件分支是**邏輯**(靜音走這句、有台詞走那句、單鏡與多鏡不同句式),
 * 把它塞進模板需要一套 `{{#if}}` 的迷你語言 —— 那會讓改一句話變成學一種語法,
 * 而且模板寫壞會直接產生無效 prompt。
 *
 * 真正想改的是**措辭**,不是結構。所以這裡只開放「哪一句話怎麼寫」,
 * 「什麼時候出現這句」留在程式裡。片段沒有變數,因此完全不需要模板語法。
 */
export const PROMPT_FRAGMENT_IDS = [
  "video-no-text",
  "video-reference-match",
  "video-ambient-only",
  "flow-intro",
  "flow-preserve",
  "flow-ambient-only",
  "extend-intro",
  "extend-continuity",
  "grid-consistency",
  "grid-no-text",
] as const;

export type PromptFragmentId = (typeof PROMPT_FRAGMENT_IDS)[number];

export interface FragmentMeta {
  id: PromptFragmentId;
  label: string;
  /** 什麼時候會出現這一句 —— 條件在程式裡,所以必須寫清楚 */
  appearsWhen: string;
  builtIn: string;
}

/**
 * **這些字串必須與改用片段前的輸出逐字相同**,否則既有專案重生的影片會與
 * 舊的不一致(有單元測試把這件事釘住)。
 */
export const FRAGMENT_META: Record<PromptFragmentId, FragmentMeta> = {
  "video-no-text": {
    id: "video-no-text",
    label: "影片:禁止畫面出現文字",
    appearsWhen: "每次生影片都會加。",
    builtIn:
      "Do not render any text, subtitles, captions, labels, or watermarks in the video. Pure visual storytelling only.",
  },
  "video-reference-match": {
    id: "video-reference-match",
    label: "影片:角色須符合參考圖",
    appearsWhen: "只有圖生影片(i2v)才加 —— 文生影片沒有參考圖,加了是指向不存在的圖。",
    builtIn:
      "The characters must match the appearance of the person(s) in the uploaded reference photo exactly — same face, hairstyle, body proportions, and clothing.",
  },
  "video-ambient-only": {
    id: "video-ambient-only",
    label: "影片:靜音(僅環境音)",
    appearsWhen: "勾了靜音時取代台詞那一段。",
    builtIn:
      "[SFX] ambient room tone and subtle environmental sound only. No dialogue, no narration, no voice.",
  },
  "flow-intro": {
    id: "flow-intro",
    label: "Flow:開場指示",
    appearsWhen: "複製 Flow(圖生影片)prompt 時的第一句。",
    builtIn:
      "Starting from this reference image, bring it to life with cinematic motion:",
  },
  "flow-preserve": {
    id: "flow-preserve",
    label: "Flow:不要改動參考圖的外觀",
    appearsWhen: "每次產 Flow prompt 都會加。",
    builtIn:
      "Do not alter the character's face, clothing, or appearance from the reference image. Do not render any text, subtitles, or watermarks.",
  },
  "flow-ambient-only": {
    id: "flow-ambient-only",
    label: "Flow:靜音(僅環境音)",
    appearsWhen: "Flow prompt 勾靜音時。措辭比影片版短 —— Flow 的畫面描述已由參考圖承擔。",
    builtIn:
      "[SFX] ambient environmental sound only. No dialogue, no narration.",
  },
  "extend-intro": {
    id: "extend-intro",
    label: "延長:開場指示",
    appearsWhen: "用 Flow 的延長功能接下一鏡時的第一句。",
    builtIn:
      "Continuing seamlessly from the previous clip, smoothly transition into the next action:",
  },
  "extend-continuity": {
    id: "extend-continuity",
    label: "延長:維持連戲",
    appearsWhen: "每次產延長 prompt 都會加。",
    builtIn:
      "Maintain visual continuity — same characters, same location, same lighting. Do not alter faces, clothing, or appearance. No text, subtitles, or watermarks.",
  },
  "grid-consistency": {
    id: "grid-consistency",
    label: "宮格:跨格角色一致",
    appearsWhen: "宮格 prompt 有帶角色參考照時。",
    builtIn: "Maintain identical character appearance across ALL images.",
  },
  "grid-no-text": {
    id: "grid-no-text",
    label: "宮格:禁止畫面出現文字",
    appearsWhen: "每次產宮格 prompt 都會加。",
    builtIn:
      "Do not include any text, words, subtitles, numbers, or labels. Tell the story purely through visuals.",
  },
};

export type FragmentOverrides = Partial<Record<PromptFragmentId, string>>;

/** 取生效的片段:覆寫優先,沒有則用內建 */
export function resolveFragment(
  id: PromptFragmentId,
  overrides: FragmentOverrides = {}
): string {
  const override = overrides[id];
  return override?.trim() ? override : FRAGMENT_META[id].builtIn;
}
