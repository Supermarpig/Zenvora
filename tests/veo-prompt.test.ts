import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVeoPrompt } from "../src/lib/veo-prompt.ts";
import type { Frame } from "../src/lib/schemas.ts";

/**
 * `hasReferenceImage` 是 t2v 鏈路加的。這裡守住兩件事:
 * 1. 不傳這個選項時輸出與先前完全一致(既有 i2v 呼叫方不受影響)
 * 2. 傳 false 時**只**少掉參考圖那一句,其餘段落不動
 */

const frame: Frame = {
  id: "f1",
  projectId: "p1",
  order: 0,
  prompt: "A woman stands alone on a rainy platform",
  dialogue: "",
  speaker: "",
  cameraMovement: "Zoom In",
  duration: 8,
  style: "Cinematic",
  mood: "Moody/Dramatic",
};

const REFERENCE_LINE =
  "The characters must match the appearance of the person(s) in the uploaded reference photo exactly — same face, hairstyle, body proportions, and clothing.";

test("預設(不傳選項)仍帶參考圖約束", () => {
  const out = buildVeoPrompt(frame, { mute: true });
  assert.ok(out.includes(REFERENCE_LINE));
});

test("明確傳 true 與不傳等價", () => {
  assert.equal(
    buildVeoPrompt(frame, { mute: true, hasReferenceImage: true }),
    buildVeoPrompt(frame, { mute: true })
  );
});

test("t2v(hasReferenceImage: false)只少掉參考圖那一段", () => {
  const withRef = buildVeoPrompt(frame, { mute: true });
  const noRef = buildVeoPrompt(frame, { mute: true, hasReferenceImage: false });

  assert.ok(!noRef.includes("reference photo"));
  assert.deepEqual(
    withRef.split("\n\n").filter((s) => s !== REFERENCE_LINE),
    noRef.split("\n\n")
  );
});

test("台詞路徑不受 hasReferenceImage 影響", () => {
  const talking: Frame = { ...frame, speaker: "小雨", dialogue: "你還記得嗎" };
  const noRef = buildVeoPrompt(talking, { hasReferenceImage: false });
  assert.ok(noRef.includes('小雨 speaks in Mandarin Chinese: "你還記得嗎"'));
  assert.ok(!noRef.includes("reference photo"));
});
