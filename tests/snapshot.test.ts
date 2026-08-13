import { test } from "node:test";
import assert from "node:assert/strict";
import {
  snapshotToZip,
  parseSnapshotZip,
  dataUrlToPayload,
  type MediaPayload,
} from "../src/lib/snapshot.ts";
import type { Snapshot } from "../src/lib/schemas.ts";

/**
 * 備份如果能匯出但匯不回來,使用者是在資料已經沒了的時候才發現 ——
 * 所以這裡的重點是 round-trip 與「壞檔要明確失敗」。
 */

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

function baseSnapshot(): Omit<Snapshot, "mediaManifest"> {
  return {
    version: 1,
    scope: "project",
    exportedAt: "2026-08-13T00:00:00.000Z",
    projects: [
      {
        id: "p1",
        name: "測試專案",
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
        dialogue: "台詞",
        speaker: "小雨",
        cameraMovement: "Fixed",
        duration: 5,
        style: "Cinematic",
        mood: "Moody/Dramatic",
      },
    ],
    assets: [
      {
        id: "a1",
        name: "小雨",
        kind: "character",
        type: "actor",
        appearance: "some appearance",
        referenceImageKeys: ["asset-a1-0"],
        tags: [],
        createdAt: "",
        updatedAt: "",
      },
    ],
  } as Omit<Snapshot, "mediaManifest">;
}

test("dataUrlToPayload 解出 mime 與二進位", () => {
  const payload = dataUrlToPayload("image-f1", PNG_DATA_URL);
  assert.ok(payload);
  assert.equal(payload!.mime, "image/png");
  assert.equal(payload!.kind, "dataUrl");
  // PNG signature
  assert.deepEqual(Array.from(payload!.data.slice(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
});

test("dataUrlToPayload 對非 data URL 回 null", () => {
  assert.equal(dataUrlToPayload("k", "https://example.com/a.png"), null);
});

test("round-trip:專案 / 分鏡 / 資產與素材完整還原", async () => {
  const image = dataUrlToPayload("image-f1", PNG_DATA_URL)!;
  const video: MediaPayload = {
    key: "video-f1",
    kind: "blob",
    mime: "video/mp4",
    data: new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]) as Uint8Array<ArrayBuffer>,
  };

  const zip = snapshotToZip(baseSnapshot(), [image, video]);
  const { snapshot, media } = await parseSnapshotZip(zip);

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.scope, "project");
  assert.equal(snapshot.projects.length, 1);
  assert.equal(snapshot.projects[0].name, "測試專案");
  assert.equal(snapshot.frames.length, 1);
  assert.equal(snapshot.frames[0].dialogue, "台詞");
  assert.equal(snapshot.assets.length, 1);
  assert.equal(snapshot.assets[0].kind, "character");

  // 圖片要還原成 data URL 字串(IndexedDB 原本就存字串)
  assert.equal(media.get("image-f1"), PNG_DATA_URL);
  // 影片要還原成 Blob 且帶回 mime
  const restoredVideo = media.get("video-f1");
  assert.ok(restoredVideo instanceof Blob);
  assert.equal((restoredVideo as Blob).type, "video/mp4");
  assert.equal((restoredVideo as Blob).size, video.data.length);
});

test("沒有素材的備份也能 round-trip", async () => {
  const { snapshot, media } = await parseSnapshotZip(
    snapshotToZip(baseSnapshot(), [])
  );
  assert.equal(media.size, 0);
  assert.equal(snapshot.mediaManifest.length, 0);
});

test("缺少 snapshot.json 時明確報錯", async () => {
  const { createZip } = await import("../src/lib/zip.ts");
  const bogus = createZip([
    { name: "random.txt", data: new TextEncoder().encode("x") as Uint8Array<ArrayBuffer> },
  ]);
  await assert.rejects(() => parseSnapshotZip(bogus), /缺少 snapshot.json/);
});

test("snapshot.json 不是合法 JSON 時明確報錯", async () => {
  const { createZip } = await import("../src/lib/zip.ts");
  const bogus = createZip([
    { name: "snapshot.json", data: new TextEncoder().encode("{not json") as Uint8Array<ArrayBuffer> },
  ]);
  await assert.rejects(() => parseSnapshotZip(bogus), /不是合法的 JSON/);
});

test("schema 不符時整批拒絕並指出欄位", async () => {
  const { createZip } = await import("../src/lib/zip.ts");
  const bad = { version: 2, scope: "project", exportedAt: "x" };
  const bogus = createZip([
    {
      name: "snapshot.json",
      data: new TextEncoder().encode(JSON.stringify(bad)) as Uint8Array<ArrayBuffer>,
    },
  ]);
  await assert.rejects(() => parseSnapshotZip(bogus), /備份格式不符/);
});

test("manifest 列了但 zip 裡沒有的素材 → 整批拒絕,不還原半套", async () => {
  const { createZip } = await import("../src/lib/zip.ts");
  const snapshot: Snapshot = {
    ...baseSnapshot(),
    mediaManifest: [
      { key: "image-f1", file: "media/image-f1", kind: "dataUrl", mime: "image/png" },
    ],
  } as Snapshot;
  const bogus = createZip([
    {
      name: "snapshot.json",
      data: new TextEncoder().encode(JSON.stringify(snapshot)) as Uint8Array<ArrayBuffer>,
    },
    // 刻意不放 media/image-f1
  ]);
  await assert.rejects(() => parseSnapshotZip(bogus), /manifest 列了/);
});
