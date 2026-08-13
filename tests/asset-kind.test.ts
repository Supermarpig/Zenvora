import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCast } from "../src/lib/cast.ts";
import { buildCharacterSheetPrompt } from "../src/lib/character-sheet-prompt.ts";
import type { CharacterAsset } from "../src/lib/schemas.ts";

/**
 * 資產種類存在的理由:對場景說「identical face, hairstyle」是純雜訊,
 * 而對房間生 turnaround(轉一圈)更是沒有意義。這裡驗證各種類走對句式。
 *
 * resolveCast 會讀 IndexedDB 取參考圖,Node 下沒有 indexedDB,所以這些測試
 * 只涵蓋「沒有參考圖」的路徑(textOnly)—— 那條不碰 db。
 */

function asset(over: Partial<CharacterAsset> & { name: string }): CharacterAsset {
  return {
    id: "a-" + over.name,
    kind: "character",
    type: "actor",
    appearance: "some appearance",
    referenceImageKeys: [],
    tags: [],
    createdAt: "",
    updatedAt: "",
    ...over,
  } as CharacterAsset;
}

test("人物的一致性指示句講臉與髮型", async () => {
  const r = await resolveCast([asset({ name: "小雨" })]);
  assert.match(r.promptPrefix, /identical face, hairstyle, body proportions, and outfit/);
});

test("場景的指示句講佈局與光線,不提臉與髮型", async () => {
  const r = await resolveCast([asset({ name: "廚房", kind: "scene" })]);
  assert.match(r.promptPrefix, /identical layout, architecture, furniture placement, and lighting setup/);
  assert.ok(
    !r.promptPrefix.includes("hairstyle"),
    "對場景說髮型是純雜訊,會稀釋 prompt"
  );
});

test("道具的指示句講形狀與材質", async () => {
  const r = await resolveCast([asset({ name: "銀托盤", kind: "prop" })]);
  assert.match(r.promptPrefix, /identical shape, material, colour, and scale/);
});

test("服裝的指示句講剪裁與垂墜", async () => {
  const r = await resolveCast([asset({ name: "圍裙", kind: "costume" })]);
  assert.match(r.promptPrefix, /identical garment cut, fabric, colour, and how it drapes/);
});

test("多種類混用時各自分組,不會把場景併進人物那句", async () => {
  const r = await resolveCast([
    asset({ name: "小雨" }),
    asset({ name: "廚房", kind: "scene" }),
    asset({ name: "阿德" }),
  ]);
  const lines = r.promptPrefix.split("\n");
  assert.equal(lines.length, 2, "應分成人物與場景兩句");

  const characterLine = lines.find((l) => l.includes("hairstyle"))!;
  assert.ok(characterLine.includes("小雨") && characterLine.includes("阿德"));
  assert.ok(!characterLine.includes("廚房"), "場景不該出現在人物那句");

  const sceneLine = lines.find((l) => l.includes("architecture"))!;
  assert.ok(sceneLine.includes("廚房"));
});

test("沒有資產時前綴為空字串", async () => {
  const r = await resolveCast([]);
  assert.equal(r.promptPrefix, "");
});

test("舊資料沒有 kind 時視為人物", async () => {
  const legacy = { ...asset({ name: "舊角色" }) } as CharacterAsset;
  delete (legacy as { kind?: unknown }).kind;
  const r = await resolveCast([legacy]);
  assert.match(r.promptPrefix, /hairstyle/, "缺 kind 應退回人物句式");
});

test("場景參考圖不生 turnaround,而是多視角 establishing shots", () => {
  const scene = buildCharacterSheetPrompt({ appearance: "老家廚房", kind: "scene" });
  assert.match(scene, /^Location reference sheet/);
  assert.match(scene, /wide establishing shot/);
  assert.ok(!scene.includes("turnaround"), "對房間說轉一圈沒有意義");
  assert.ok(!scene.includes("Full body"), "場景沒有全身");
});

test("道具與服裝共用白底產品圖", () => {
  const prop = buildCharacterSheetPrompt({ appearance: "銀托盤", kind: "prop" });
  const costume = buildCharacterSheetPrompt({ appearance: "藍圍裙", kind: "costume" });
  assert.match(prop, /^Product reference sheet/);
  assert.match(prop, /pure white background/);
  assert.match(costume, /^Product reference sheet/);
});

test("人物仍走原本的 turnaround,presenter 走肖像", () => {
  assert.match(
    buildCharacterSheetPrompt({ appearance: "x", kind: "character" }),
    /^Character reference sheet \(turnaround\)/
  );
  assert.match(
    buildCharacterSheetPrompt({ appearance: "x", kind: "character", type: "presenter" }),
    /^Professional upper-body portrait/
  );
});

test("場景與道具的模板可各自覆寫,不互相影響", () => {
  const templates = { sceneSheet: "SCENE {{appearance}}" };
  assert.equal(
    buildCharacterSheetPrompt({ appearance: "廚房", kind: "scene" }, templates),
    "SCENE 廚房"
  );
  assert.match(
    buildCharacterSheetPrompt({ appearance: "托盤", kind: "prop" }, templates),
    /^Product reference sheet/
  );
});
