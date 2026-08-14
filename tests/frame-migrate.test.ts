import { test } from "node:test";
import assert from "node:assert/strict";
import {
  migrateFrameImageFields,
  migrateFrames,
} from "../src/lib/frame-migrate.ts";
import { frameSchema, snapshotSchema } from "../src/lib/schemas.ts";

/**
 * D3 的遷移**改壞會弄丟使用者的圖** —— 不是壞掉報錯，而是靜默地變成
 * 「素材還在 IndexedDB 裡，但畫面說沒有圖」。所以這裡的覆蓋要比一般功能更硬。
 */

test("沒有舊欄位 → hasImage false、版本 0", () => {
  const out = migrateFrameImageFields({ id: "f1" });
  assert.equal(out.hasImage, false);
  assert.equal(out.imageVersion, 0);
});

test("舊欄位是空字串 → 視為沒有圖", () => {
  const out = migrateFrameImageFields({ id: "f1", imageBase64Key: "" });
  assert.equal(out.hasImage, false);
  assert.equal(out.imageVersion, 0);
});

test("舊欄位有值且無版本後綴 → 有圖、版本 0", () => {
  const out = migrateFrameImageFields({
    id: "f1",
    imageBase64Key: "image-f1",
  });
  assert.equal(out.hasImage, true);
  assert.equal(out.imageVersion, 0);
});

test("舊欄位帶 # 版本後綴 → 版本號沿用那個數字", () => {
  const out = migrateFrameImageFields({
    id: "f1",
    imageBase64Key: "image-f1#1723600000000",
  });
  assert.equal(out.hasImage, true);
  assert.equal(out.imageVersion, 1723600000000);
});

test("# 後面不是數字 → 版本給 1(只要不是 0 就表達得出「動過」)", () => {
  const out = migrateFrameImageFields({
    id: "f1",
    imageBase64Key: "image-f1#abc",
  });
  assert.equal(out.hasImage, true);
  assert.equal(out.imageVersion, 1);
});

test("遷移後舊欄位被清掉,不留兩份真相", () => {
  const out = migrateFrameImageFields({
    id: "f1",
    imageBase64Key: "image-f1",
  });
  assert.equal(out.imageBase64Key, undefined);
});

test("冪等:連跑兩次結果相同(舊欄位第一次就被清空)", () => {
  const legacy = { id: "f1", imageBase64Key: "image-f1#42" };
  const once = migrateFrameImageFields(legacy);
  const twice = migrateFrameImageFields(once);
  assert.deepEqual(twice, once);
  assert.equal(twice.hasImage, true);
  assert.equal(twice.imageVersion, 42);
});

test("新舊欄位同時存在時**以舊欄位為準** —— 這是最容易寫錯的一條", () => {
  // 舊備份的 JSON 經過 frameSchema.parse() 之後,zod 的 .default(false) 會把
  // hasImage 填上,但舊欄位還在。若以「有 hasImage 就當已遷移」來跳過,
  // 圖會靜默消失 —— 這個測試就是在守這件事。
  const parsedOldBackup = {
    id: "f1",
    hasImage: false,
    imageVersion: 0,
    imageBase64Key: "image-f1#99",
  };
  const out = migrateFrameImageFields(parsedOldBackup);
  assert.equal(out.hasImage, true);
  assert.equal(out.imageVersion, 99);
});

test("已遷移的資料(舊欄位已清空)保留新欄位的值", () => {
  const out = migrateFrameImageFields({
    id: "f1",
    hasImage: true,
    imageVersion: 42,
  });
  assert.equal(out.hasImage, true);
  assert.equal(out.imageVersion, 42);
});

test("其他欄位一個都不能動", () => {
  const before = {
    id: "f1",
    projectId: "p1",
    prompt: "a shot",
    duration: 6,
    videoKey: "video-f1",
    episodeId: "e1",
    imageBase64Key: "image-f1#5",
  };
  const out = migrateFrameImageFields(before);
  assert.equal(out.projectId, "p1");
  assert.equal(out.prompt, "a shot");
  assert.equal(out.duration, 6);
  assert.equal(out.videoKey, "video-f1");
  assert.equal(out.episodeId, "e1");
});

test("migrateFrames:非陣列輸入回空陣列而不是丟錯", () => {
  assert.deepEqual(migrateFrames(undefined), []);
  assert.deepEqual(migrateFrames(null), []);
  assert.deepEqual(migrateFrames("nope"), []);
});

test("migrateFrames:陣列裡有 null 也不會炸", () => {
  const out = migrateFrames([null, { id: "f1", imageBase64Key: "image-f1" }]);
  assert.equal(out.length, 2);
  assert.equal(out[1].hasImage, true);
});

test("migrateFrames 逐筆獨立 —— 一筆有圖不會傳染給其他筆", () => {
  const out = migrateFrames([
    { id: "a", imageBase64Key: "image-a" },
    { id: "b" },
    { id: "c", imageBase64Key: "image-c#7" },
  ]);
  assert.deepEqual(
    out.map((f) => [f.hasImage, f.imageVersion]),
    [
      [true, 0],
      [false, 0],
      [true, 7],
    ]
  );
});

// --- 與 schema 的接點 ---

test("frameSchema 對舊資料仍可 parse,且補上新欄位的預設值", () => {
  const old = {
    id: "f1",
    projectId: "p1",
    order: 0,
    prompt: "a shot",
    imageBase64Key: "image-f1",
  };
  const parsed = frameSchema.parse(old);
  // 舊欄位保留(還原路徑要靠它換算),新欄位有預設
  assert.equal(parsed.imageBase64Key, "image-f1");
  assert.equal(parsed.hasImage, false);
  assert.equal(parsed.imageVersion, 0);
});

test("關鍵回歸:舊備份 parse 後再遷移,圖不會消失", () => {
  const oldBackup = {
    version: 1 as const,
    scope: "project" as const,
    exportedAt: "2026-08-01T00:00:00.000Z",
    projects: [
      {
        id: "p1",
        name: "舊專案",
        description: "",
        characters: [],
        createdAt: "",
        updatedAt: "",
      },
    ],
    frames: [
      {
        id: "f1",
        projectId: "p1",
        order: 0,
        prompt: "a shot",
        imageBase64Key: "image-f1#1700000000000",
      },
    ],
    assets: [],
    mediaManifest: [],
  };

  // 走的是還原路徑:先 zod parse,再 migrateFrames
  const parsed = snapshotSchema.parse(oldBackup);
  const frames = migrateFrames(parsed.frames);

  assert.equal(frames[0].hasImage, true, "舊備份的圖不能在還原後消失");
  assert.equal(frames[0].imageVersion, 1700000000000);
});
