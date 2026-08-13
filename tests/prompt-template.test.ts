import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderTemplate,
  resolveTemplate,
  TEMPLATE_META,
  PROMPT_TEMPLATE_IDS,
} from "../src/lib/prompt-template.ts";
import { buildImagePrompt } from "../src/lib/veo-prompt.ts";
import { buildCharacterSheetPrompt } from "../src/lib/character-sheet-prompt.ts";
import type { Frame } from "../src/lib/schemas.ts";

/**
 * 這裡最重要的一組測試是「未覆寫時輸出與改用模板前逐字相同」——
 * 引入模板層若悄悄改動了一個標點,既有專案重生的圖就會跟舊圖不一致,
 * 而那要等生完圖才看得出來。基準字串是從改動前的實作抄出來的。
 */

const frame: Frame = {
  id: "f1",
  projectId: "p1",
  order: 0,
  prompt: "A red maple leaf on wet stone",
  dialogue: "",
  speaker: "",
  cameraMovement: "Fixed",
  duration: 5,
  style: "Cinematic",
  mood: "Warm/Golden Hour",
} as Frame;

test("生圖 prompt 未覆寫時與改用模板前逐字相同", () => {
  const BASELINE =
    "A red maple leaf on wet stone\n\n" +
    "Shot on 35mm anamorphic lens with oval bokeh and horizontal flare, cinematic 2.39:1 widescreen aesthetic, shallow depth of field. " +
    "Warm golden hour lighting with soft amber rim light, gentle volumetric rays through windows, anamorphic lens flare.\n\n" +
    "Do not include any text, words, subtitles, captions, labels, watermarks, or speech bubbles anywhere in the image. Pure visual only.";

  assert.equal(buildImagePrompt(frame), BASELINE);
});

test("三視圖 prompt 未覆寫時與改用模板前逐字相同", () => {
  const BASELINE = [
    "Character reference sheet (turnaround) of ONE single consistent character.",
    "Character: a woman in a grey knit sweater.",
    "Show the SAME character in three views side by side on a clean neutral light-gray studio background: front view, 3/4 view, and side profile. Full body, standing in a relaxed neutral pose.",
    "Keep the face, hairstyle, body proportions, and outfit IDENTICAL across all three views. Even soft studio lighting, no harsh shadows.",
    "Do not include any text, labels, watermarks, measurement lines, grids, or color swatches. Pure clean character turnaround only.",
  ].join("\n");

  assert.equal(
    buildCharacterSheetPrompt({ appearance: "a woman in a grey knit sweater" }),
    BASELINE
  );
});

test("數字人 prompt 未覆寫時與改用模板前逐字相同", () => {
  const BASELINE = [
    "Professional upper-body portrait of a single friendly presenter, facing the camera with a warm confident expression.",
    "Character: a friendly host.",
    "Clean neutral studio background, even soft key lighting, sharp focus on the face, natural skin tones.",
    "Do not include any text, labels, watermarks, logos, or graphics. Pure clean portrait only.",
  ].join("\n");

  assert.equal(
    buildCharacterSheetPrompt({ appearance: "a friendly host", type: "presenter" }),
    BASELINE
  );
});

test("覆寫模板後生圖 prompt 改用新模板", () => {
  const out = buildImagePrompt(frame, "只要 {{prompt}} 加上 {{lens}}");
  assert.match(out, /^只要 A red maple leaf on wet stone 加上 Shot on 35mm/);
  assert.ok(!out.includes("Pure visual only"), "內建的尾段不該出現");
});

test("覆寫為空白或全空白時退回內建", () => {
  assert.equal(buildImagePrompt(frame, ""), buildImagePrompt(frame));
  assert.equal(buildImagePrompt(frame, "   \n  "), buildImagePrompt(frame));
});

test("覆寫三視圖模板只影響對應類型", () => {
  const templates = { characterSheet: "TURNAROUND {{appearance}}" };
  assert.equal(
    buildCharacterSheetPrompt({ appearance: "x" }, templates),
    "TURNAROUND x"
  );
  // presenter 沒被覆寫,應仍是內建
  assert.match(
    buildCharacterSheetPrompt({ appearance: "x", type: "presenter" }, templates),
    /^Professional upper-body portrait/
  );
});

test("未知變數原樣保留(不靜默變空字串)", () => {
  const out = renderTemplate("{{prompt}} 與 {{nope}}", { prompt: "A" });
  assert.equal(out, "A 與 {{nope}}", "打錯變數名要能從輸出看出來");
});

test("變數可重複使用,且容許空白", () => {
  assert.equal(
    renderTemplate("{{a}}-{{ a }}-{{a}}", { a: "x" }),
    "x-x-x"
  );
});

test("resolveTemplate:有覆寫用覆寫,空白退回內建", () => {
  assert.equal(resolveTemplate("image", { image: "custom" }), "custom");
  assert.equal(
    resolveTemplate("image", { image: "  " }),
    TEMPLATE_META.image.builtIn
  );
  assert.equal(resolveTemplate("image"), TEMPLATE_META.image.builtIn);
});

test("每個模板宣告的變數都真的出現在內建模板裡", () => {
  for (const id of PROMPT_TEMPLATE_IDS) {
    const meta = TEMPLATE_META[id];
    for (const v of meta.variables) {
      assert.ok(
        meta.builtIn.includes(`{{${v}}}`),
        `${id} 宣告了變數 ${v} 但內建模板沒用到,UI 會顯示不存在的變數`
      );
    }
  }
});

test("內建模板裡沒有未宣告的變數", () => {
  for (const id of PROMPT_TEMPLATE_IDS) {
    const meta = TEMPLATE_META[id];
    const used = [...meta.builtIn.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);
    for (const v of used) {
      assert.ok(
        meta.variables.includes(v),
        `${id} 的內建模板用了 ${v} 但沒宣告,使用者改模板時不知道它可用`
      );
    }
  }
});
