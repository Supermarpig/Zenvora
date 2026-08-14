import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTimeline,
  buildSrt,
  clipBaseName,
  buildCompatSrt,
  type FrameAssetFlags,
} from "../src/lib/timeline-export.ts";
import type { Frame } from "../src/lib/schemas.ts";

/**
 * 時間軸累加與 SRT 時間碼算錯,會讓字幕跟畫面越走越歪 —— 而那要到剪映裡
 * 播放才看得出來。這裡直接驗數值。
 */

const EXPORTED_AT = "2026-08-13T00:00:00.000Z";

function frame(over: Partial<Frame> & { order: number }): Frame {
  return {
    id: "f" + over.order,
    projectId: "p1",
    prompt: "shot " + over.order,
    dialogue: "",
    speaker: "",
    cameraMovement: "Fixed",
    duration: 8,
    style: "Cinematic",
    mood: "Moody/Dramatic",
    ...over,
  } as Frame;
}

test("startSec 依序累加,總長為各鏡之和", () => {
  const frames = [
    frame({ order: 0, duration: 5 }),
    frame({ order: 1, duration: 6 }),
    frame({ order: 2, duration: 4 }),
  ];
  const t = buildTimeline("P", frames, {}, EXPORTED_AT);

  assert.deepEqual(
    t.clips.map((c) => [c.shot, c.startSec, c.durationSec]),
    [
      [1, 0, 5],
      [2, 5, 6],
      [3, 11, 4],
    ]
  );
  assert.equal(t.totalDurationSec, 15);
});

test("有實際影片時,videoDurationSec 優先於 duration", () => {
  const frames = [
    frame({ order: 0, duration: 8, videoDurationSec: 5.5 }),
    frame({ order: 1, duration: 8 }),
  ];
  const t = buildTimeline("P", frames, {}, EXPORTED_AT);

  assert.equal(t.clips[0].durationSec, 5.5, "應採用影片實際長度");
  assert.equal(t.clips[1].startSec, 5.5, "後續鏡次的起點要跟著位移");
  assert.equal(t.totalDurationSec, 13.5);
});

test("素材檔名依 flags 決定,副檔名沿用實際格式", () => {
  const frames = [frame({ order: 0 }), frame({ order: 1 }), frame({ order: 2 })];
  const flags: Record<string, FrameAssetFlags> = {
    f0: { imageExt: "png", hasVideo: true },
    f1: { imageExt: "jpg", hasVideo: false },
    f2: { hasVideo: false },
  };
  const t = buildTimeline("P", frames, flags, EXPORTED_AT);

  assert.equal(t.clips[0].videoFile, "assets/001.mp4");
  assert.equal(t.clips[0].imageFile, "assets/001.png");
  assert.equal(t.clips[1].videoFile, undefined);
  assert.equal(t.clips[1].imageFile, "assets/002.jpg");
  assert.equal(t.clips[2].imageFile, undefined, "沒有 imageExt 就不該有檔名");
});

test("SRT 時間碼格式與時間軸對齊", () => {
  const frames = [
    frame({ order: 0, duration: 5.5, speaker: "小雨", dialogue: "第一句" }),
    frame({ order: 1, duration: 6 }),
    frame({ order: 2, duration: 4, speaker: "阿德", dialogue: "第三句" }),
  ];
  const srt = buildSrt(buildTimeline("P", frames, {}, EXPORTED_AT));

  assert.equal(
    srt,
    "1\n00:00:00,000 --> 00:00:05,500\n小雨：第一句\n\n" +
      "2\n00:00:11,500 --> 00:00:15,500\n阿德：第三句\n"
  );
});

test("沒有對白的鏡次不出字幕,但仍佔用時間軸", () => {
  const frames = [
    frame({ order: 0, duration: 10 }),
    frame({ order: 1, duration: 3, dialogue: "只有這句" }),
  ];
  const srt = buildSrt(buildTimeline("P", frames, {}, EXPORTED_AT));

  assert.match(srt, /^1\n00:00:10,000 --> 00:00:13,000\n只有這句\n$/, "編號從 1 起算且起點為 10s");
});

test("沒有說話者時字幕不加冒號前綴", () => {
  const frames = [frame({ order: 0, duration: 2, dialogue: "旁白" })];
  const srt = buildSrt(buildTimeline("P", frames, {}, EXPORTED_AT));
  assert.equal(srt, "1\n00:00:00,000 --> 00:00:02,000\n旁白\n");
});

test("全片無對白時回傳空字串(不產生空的 SRT)", () => {
  const srt = buildSrt(buildTimeline("P", [frame({ order: 0 })], {}, EXPORTED_AT));
  assert.equal(srt, "");
});

test("時間碼跨越一小時仍正確", () => {
  const frames = [
    frame({ order: 0, duration: 3600 }),
    frame({ order: 1, duration: 5, dialogue: "一小時後" }),
  ];
  const srt = buildSrt(buildTimeline("P", frames, {}, EXPORTED_AT));
  assert.match(srt, /01:00:00,000 --> 01:00:05,000/);
});

test("clipBaseName 補零到三位", () => {
  assert.equal(clipBaseName(1), "001");
  assert.equal(clipBaseName(10), "010");
  assert.equal(clipBaseName(100), "100");
});

test("buildCompatSrt:加 UTF-8 BOM 且換行改成 CRLF", () => {
  const srt = "1\n00:00:00,000 --> 00:00:05,000\n小雨：你好\n";
  const bytes = buildCompatSrt(srt);

  // 前三個位元組必須是 BOM
  assert.deepEqual(Array.from(bytes.slice(0, 3)), [0xef, 0xbb, 0xbf]);

  const text = new TextDecoder().decode(bytes.slice(3));
  assert.equal(text, "1\r\n00:00:00,000 --> 00:00:05,000\r\n小雨：你好\r\n");
});

test("buildCompatSrt:既有的 CRLF 不會變成 \\r\\r\\n", () => {
  const already = "1\r\n00:00:00,000 --> 00:00:05,000\r\n台詞\r\n";
  const text = new TextDecoder().decode(buildCompatSrt(already).slice(3));
  assert.ok(!text.includes("\r\r"));
  assert.equal(text, already);
});

test("buildCompatSrt:空字串回傳空陣列(不產生只有 BOM 的檔案)", () => {
  assert.equal(buildCompatSrt("").length, 0);
});

test("buildCompatSrt 的內容與 buildSrt 逐字相同(只差編碼)", () => {
  const timeline = buildTimeline(
    "p",
    [
      frame({ order: 0, dialogue: "台詞一", speaker: "小雨" }),
      frame({ order: 1, dialogue: "台詞二" }),
    ],
    {},
    "t"
  );
  const srt = buildSrt(timeline);
  const decoded = new TextDecoder()
    .decode(buildCompatSrt(srt).slice(3))
    .replace(/\r\n/g, "\n");
  assert.equal(decoded, srt);
});
