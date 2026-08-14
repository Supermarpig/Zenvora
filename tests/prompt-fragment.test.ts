import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROMPT_FRAGMENT_IDS,
  FRAGMENT_META,
  resolveFragment,
} from "../src/lib/prompt-template.ts";
import {
  buildVeoPrompt,
  buildFlowPrompt,
  buildExtendPrompt,
} from "../src/lib/veo-prompt.ts";
import { buildGridPrompt } from "../src/lib/storyboard-prompt.ts";
import type { Frame } from "../src/lib/schemas.ts";

/**
 * 片段化最大的風險是**改壞既有輸出** —— 內建片段必須與硬編碼時逐字相同,
 * 否則既有專案重生的影片會跟舊的不一致。
 *
 * 下面的期望字串是從改動前的程式碼**原樣抄過來的**,不是從 FRAGMENT_META 讀的
 * —— 從同一個來源讀就測不出任何東西。
 */

function frame(over: Partial<Frame> = {}): Frame {
  return {
    id: "f1",
    projectId: "p1",
    order: 0,
    prompt: "a butler polishing silver",
    dialogue: "",
    speaker: "",
    cameraMovement: "Zoom In",
    duration: 8,
    style: "Cinematic",
    mood: "Moody/Dramatic",
    ...over,
  } as Frame;
}

const BEFORE = {
  videoReferenceMatch:
    "The characters must match the appearance of the person(s) in the uploaded reference photo exactly — same face, hairstyle, body proportions, and clothing.",
  videoNoText:
    "Do not render any text, subtitles, captions, labels, or watermarks in the video. Pure visual storytelling only.",
  videoAmbient:
    "[SFX] ambient room tone and subtle environmental sound only. No dialogue, no narration, no voice.",
  flowIntro:
    "Starting from this reference image, bring it to life with cinematic motion:",
  flowPreserve:
    "Do not alter the character's face, clothing, or appearance from the reference image. Do not render any text, subtitles, or watermarks.",
  flowAmbient:
    "[SFX] ambient environmental sound only. No dialogue, no narration.",
  extendIntro:
    "Continuing seamlessly from the previous clip, smoothly transition into the next action:",
  extendContinuity:
    "Maintain visual continuity — same characters, same location, same lighting. Do not alter faces, clothing, or appearance. No text, subtitles, or watermarks.",
  gridConsistency: "Maintain identical character appearance across ALL images.",
  gridNoText:
    "Do not include any text, words, subtitles, numbers, or labels. Tell the story purely through visuals.",
};

test("內建片段與硬編碼時逐字相同(防回歸)", () => {
  assert.equal(resolveFragment("video-reference-match"), BEFORE.videoReferenceMatch);
  assert.equal(resolveFragment("video-no-text"), BEFORE.videoNoText);
  assert.equal(resolveFragment("video-ambient-only"), BEFORE.videoAmbient);
  assert.equal(resolveFragment("flow-intro"), BEFORE.flowIntro);
  assert.equal(resolveFragment("flow-preserve"), BEFORE.flowPreserve);
  assert.equal(resolveFragment("flow-ambient-only"), BEFORE.flowAmbient);
  assert.equal(resolveFragment("extend-intro"), BEFORE.extendIntro);
  assert.equal(resolveFragment("extend-continuity"), BEFORE.extendContinuity);
  assert.equal(resolveFragment("grid-consistency"), BEFORE.gridConsistency);
  assert.equal(resolveFragment("grid-no-text"), BEFORE.gridNoText);
});

test("每個 id 都有 meta,且 meta 的 id 與鍵一致", () => {
  for (const id of PROMPT_FRAGMENT_IDS) {
    const meta = FRAGMENT_META[id];
    assert.ok(meta, `${id} 缺 meta`);
    assert.equal(meta.id, id);
    assert.ok(meta.label.length > 0, `${id} 缺 label`);
    assert.ok(meta.appearsWhen.length > 0, `${id} 缺 appearsWhen`);
    assert.ok(meta.builtIn.length > 0, `${id} 缺 builtIn`);
  }
});

test("空字串或全空白的覆寫視為未覆寫", () => {
  assert.equal(
    resolveFragment("video-no-text", { "video-no-text": "" }),
    BEFORE.videoNoText
  );
  assert.equal(
    resolveFragment("video-no-text", { "video-no-text": "   " }),
    BEFORE.videoNoText
  );
});

// --- 組出來的完整 prompt ---

test("buildVeoPrompt:不傳 fragments 與傳空物件等價", () => {
  const f = frame({ dialogue: "門後面有東西。", speaker: "管家" });
  assert.equal(
    buildVeoPrompt(f, { mute: true }),
    buildVeoPrompt(f, { mute: true, fragments: {} })
  );
});

test("buildVeoPrompt:覆寫只換掉那一句,其餘段落不動", () => {
  const f = frame();
  const before = buildVeoPrompt(f, { mute: true });
  const after = buildVeoPrompt(f, {
    mute: true,
    fragments: { "video-no-text": "NO TEXT PLEASE." },
  });

  assert.ok(!after.includes(BEFORE.videoNoText));
  assert.ok(after.includes("NO TEXT PLEASE."));
  assert.deepEqual(
    before.split("\n\n").filter((s) => s !== BEFORE.videoNoText),
    after.split("\n\n").filter((s) => s !== "NO TEXT PLEASE.")
  );
});

test("buildVeoPrompt:t2v 不出現參考圖那一句,覆寫也不會讓它冒出來", () => {
  const out = buildVeoPrompt(frame(), {
    hasReferenceImage: false,
    fragments: { "video-reference-match": "SHOULD NOT APPEAR" },
  });
  assert.ok(!out.includes("SHOULD NOT APPEAR"));
});

test("buildFlowPrompt / buildExtendPrompt:覆寫生效且不互相污染", () => {
  const f = frame();
  const flow = buildFlowPrompt(f, true, { "flow-intro": "FLOW START" });
  assert.ok(flow.startsWith("FLOW START"));
  assert.ok(!flow.includes(BEFORE.extendIntro));

  const ext = buildExtendPrompt(f, frame({ order: 1 }), true, {
    "extend-intro": "EXT START",
  });
  assert.ok(ext.startsWith("EXT START"));
  assert.ok(!ext.includes(BEFORE.flowIntro));
});

test("延長與 Flow 共用靜音那一句 —— 改一次兩邊都變", () => {
  const f = frame();
  const over = { "flow-ambient-only": "SILENT." };
  assert.ok(buildFlowPrompt(f, true, over).includes("SILENT."));
  assert.ok(buildExtendPrompt(f, frame({ order: 1 }), true, over).includes("SILENT."));
});

test("buildGridPrompt:沒帶角色時借用影片的參考圖那一句", () => {
  const out = buildGridPrompt([frame()], 9, [], "landscape", {
    "video-reference-match": "GRID REF LINE",
  });
  assert.ok(out.includes("GRID REF LINE"));
});

test("buildGridPrompt:帶角色時用 grid-consistency,且 grid-no-text 生效", () => {
  const out = buildGridPrompt(
    [frame()],
    9,
    [{ id: "c1", name: "管家", description: "an older butler" }],
    "landscape",
    { "grid-consistency": "SAME FACE", "grid-no-text": "NO LABELS" }
  );
  assert.ok(out.includes("SAME FACE"));
  assert.ok(out.includes("NO LABELS"));
  assert.ok(!out.includes(BEFORE.gridConsistency));
  assert.ok(!out.includes(BEFORE.gridNoText));
});

test("buildGridPrompt:多鏡路徑的 grid-no-text 也接上了", () => {
  const out = buildGridPrompt(
    [frame(), frame({ order: 1 }), frame({ order: 2 })],
    9,
    [],
    "landscape",
    { "grid-no-text": "MULTI NO TEXT" }
  );
  assert.ok(out.includes("MULTI NO TEXT"));
  assert.ok(!out.includes(BEFORE.gridNoText));
});
