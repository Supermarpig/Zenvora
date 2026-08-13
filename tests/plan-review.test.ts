import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewPlan, estimateCost, type Pricing } from "../src/lib/plan-review.ts";
import { findMissingMentions } from "../src/lib/mention.ts";
import type { CharacterAsset, Frame } from "../src/lib/schemas.ts";

/**
 * 預審的價值在「花錢之前擋下問題」,所以誤報比漏報更傷 —— 使用者被誤報幾次
 * 就不會再看這份清單了。這裡逐條驗規則不會亂叫。
 */

const PRICING: Pricing = { imageUnitCredits: 2, videoUnitCreditsPerSec: 15 };

function frame(over: Partial<Frame> & { order: number }): Frame {
  return {
    id: "f" + over.order,
    projectId: "p1",
    prompt: "a well described cinematic scene with warm light",
    dialogue: "",
    speaker: "",
    cameraMovement: "Fixed",
    duration: 8,
    style: "Cinematic",
    mood: "Moody/Dramatic",
    ...over,
  } as Frame;
}

function asset(name: string): CharacterAsset {
  return {
    id: "a-" + name,
    name,
    type: "actor",
    appearance: "some appearance",
    referenceImageKeys: [],
    tags: [],
    createdAt: "",
    updatedAt: "",
  } as CharacterAsset;
}

const categories = (r: ReturnType<typeof reviewPlan>) =>
  r.issues.map((i) => i.category);

test("完整的分鏡不該有 blocker 或 warning", () => {
  const frames = [
    frame({ order: 0, dialogue: "hello" }),
    frame({ order: 1, prompt: "another fully described shot in a warm kitchen" }),
  ];
  const r = reviewPlan(frames, [], PRICING);
  const bad = r.issues.filter((i) => i.severity !== "hint");
  assert.deepEqual(bad, [], "不該誤報:" + JSON.stringify(bad));
});

test("空白場景描述是 blocker", () => {
  const r = reviewPlan([frame({ order: 0, prompt: "" })], [], PRICING);
  const issue = r.issues.find((i) => i.category === "missing-prompt");
  assert.equal(issue?.severity, "blocker");
  assert.equal(issue?.shot, 1);
});

test("過短的描述是 warning 而非 blocker", () => {
  const r = reviewPlan([frame({ order: 0, prompt: "a cat" })], [], PRICING);
  const issue = r.issues.find(
    (i) => i.category === "missing-prompt" && i.shot === 1
  );
  assert.equal(issue?.severity, "warning");
});

test("只有 @角色名 是中文時,不該報「含中文」", () => {
  // 這是實際踩到的誤報:角色名本來就常是中文,不該建議使用者改英文
  const r = reviewPlan(
    [frame({ order: 0, prompt: "@管家 polishing a silver tray in warm candlelight" })],
    [asset("管家")],
    PRICING
  );
  assert.ok(
    !categories(r).includes("prompt-language"),
    "剝除 @引用後已無中文,不該報"
  );
});

test("中文描述不因字數少而誤判過短(資訊密度較高)", () => {
  // 14 個中文字的描述其實很完整,用英文的字數閾值會誤報
  const r = reviewPlan(
    [frame({ order: 0, prompt: "一個女子站在廚房的窗邊看著雨" })],
    [],
    PRICING
  );
  const thin = r.issues.find(
    (i) => i.category === "missing-prompt" && i.severity === "warning"
  );
  assert.equal(thin, undefined, "不該判定為過短");
});

test("描述含中文只給 hint(不擋)", () => {
  const r = reviewPlan(
    [frame({ order: 0, prompt: "一個穿著紅色毛衣的女子站在廚房窗邊" })],
    [],
    PRICING
  );
  const issue = r.issues.find((i) => i.category === "prompt-language");
  assert.equal(issue?.severity, "hint");
});

test("描述要求畫面出現文字會被標出(與 no-text 指示衝突)", () => {
  const r = reviewPlan(
    [frame({ order: 0, prompt: "a neon sign with the text HELLO on a wet street" })],
    [],
    PRICING
  );
  assert.ok(categories(r).includes("prompt-conflict"));
});

test("英文描述不含 text 類字眼時不該誤報衝突", () => {
  const r = reviewPlan(
    [frame({ order: 0, prompt: "a contextual wide shot of a subtle textured wall" })],
    [],
    PRICING
  );
  // "contextual" / "textured" 內含 text,但有字界檢查所以不該命中
  assert.ok(!categories(r).includes("prompt-conflict"), "字界檢查失效會造成誤報");
});

test("重複的場景描述只報一次", () => {
  const same = "identical description across three shots in the same room";
  const frames = [
    frame({ order: 0, prompt: same }),
    frame({ order: 1, prompt: same }),
    frame({ order: 2, prompt: same }),
  ];
  const r = reviewPlan(frames, [], PRICING);
  const dups = r.issues.filter((i) => i.category === "duplicate-prompt");
  assert.equal(dups.length, 1);
  assert.match(dups[0].message, /3 個分鏡/);
});

test("@ 了不存在的角色是 blocker", () => {
  const frames = [
    frame({ order: 0, prompt: "@小雨 走進廚房,@管家 在擦桌子,warm evening light" }),
  ];
  const r = reviewPlan(frames, [asset("小雨")], PRICING);
  const issue = r.issues.find((i) => i.category === "missing-asset");
  assert.equal(issue?.severity, "blocker");
  assert.match(issue!.message, /管家/);
  assert.ok(!issue!.message.includes("小雨"), "已存在的角色不該被列為缺失");
});

test("issues 依嚴重度排序:blocker 在最前", () => {
  const frames = [
    frame({ order: 0, prompt: "" }),
    frame({ order: 1, prompt: "短" }),
    frame({ order: 2 }),
  ];
  const r = reviewPlan(frames, [], PRICING);
  const severities = r.issues.map((i) => i.severity);
  assert.equal(severities[0], "blocker");
  assert.deepEqual(
    [...severities].sort(
      (a, b) =>
        ({ blocker: 0, warning: 1, hint: 2 })[a] -
        ({ blocker: 0, warning: 1, hint: 2 })[b]
    ),
    severities,
    "順序必須是 blocker → warning → hint"
  );
});

test("成本估算:已有素材的鏡次不重複計費", () => {
  const frames = [
    frame({ order: 0 }),
    frame({ order: 1, imageBase64Key: "image-f1" }),
    frame({ order: 2, imageBase64Key: "image-f2", videoKey: "video-f2" }),
  ];
  const cost = estimateCost(frames, PRICING);

  assert.equal(cost.framesNeedingImage, 1, "只有第 1 鏡缺圖");
  assert.equal(cost.framesNeedingVideo, 2, "前兩鏡缺影片");
  assert.equal(cost.imageCredits, 2);
  assert.equal(cost.videoCredits, 15 * 8 * 2, "影片單價是每秒,要乘秒數");
  assert.equal(cost.totalCredits, 2 + 240);
});

test("影片成本用 videoDurationSec 優先於 duration", () => {
  const frames = [frame({ order: 0, duration: 8, videoDurationSec: 5 })];
  const cost = estimateCost(frames, PRICING);
  assert.equal(cost.videoCredits, 15 * 5);
});

test("全片過長只給 hint", () => {
  const frames = Array.from({ length: 20 }, (_, i) => frame({ order: i, duration: 10 }));
  const r = reviewPlan(frames, [], PRICING);
  const pacing = r.issues.find((i) => i.category === "pacing");
  assert.equal(pacing?.severity, "hint");
  assert.equal(r.totalDurationSec, 200);
});

test("findMissingMentions 不把 email 當角色引用", () => {
  const missing = findMissingMentions(["contact me at hello@example.com"], []);
  assert.deepEqual(missing, []);
});

test("findMissingMentions 認得標點後的邊界", () => {
  const missing = findMissingMentions(["@小雨,然後 @阿德。"], []);
  assert.deepEqual(missing.sort(), ["阿德", "小雨"].sort());
});
