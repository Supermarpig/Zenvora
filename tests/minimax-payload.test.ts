import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMinimaxPayload } from "../src/lib/video/minimax-provider.ts";
import { snapDuration, supportedAspects } from "../src/lib/video/index.ts";
import type { VideoGenRequest } from "../src/lib/video/types.ts";

/**
 * 同 Veo:首尾關鍵幀最大的風險不是「結束幀沒生效」,而是**改壞現有的圖生影片**。
 * H3 走 V2 的 content 陣列 + role 標記,結構跟 Veo 不同,要有自己的回歸釘著。
 */

const PNG = "data:image/png;base64,iVBORw0KGgoAAAA";
const JPG = "data:image/jpeg;base64,/9j/4AAQSkZJRg";

function req(over: Partial<VideoGenRequest> = {}): VideoGenRequest {
  return {
    mode: "i2v",
    prompt: "a butler in a dark study",
    imageDataUrl: PNG,
    aspectRatio: "16:9",
    durationSec: 8,
    withAudio: false,
    model: "MiniMax-H3",
    ...over,
  };
}

test("i2v 無結束幀:content = [text, first_frame],基本欄位正確", () => {
  const p = buildMinimaxPayload(req());
  assert.equal(p.model, "MiniMax-H3");
  assert.equal(p.ratio, "16:9");
  assert.equal(p.duration, 8);
  assert.equal(p.resolution, "768P"); // 預設
  assert.equal(p.content.length, 2);
  assert.deepEqual(p.content[0], { type: "text", text: "a butler in a dark study" });
  assert.deepEqual(p.content[1], {
    type: "image_url",
    image_url: { url: PNG }, // V2 直接吃 data URI,不剝 base64
    role: "first_frame",
  });
});

test("傳 undefined 結束幀與完全不傳等價", () => {
  assert.deepEqual(
    buildMinimaxPayload(req({ endImageDataUrl: undefined })),
    buildMinimaxPayload(req())
  );
});

test("有結束幀時追加 last_frame,且 first_frame 不變", () => {
  const withEnd = buildMinimaxPayload(req({ endImageDataUrl: JPG }));
  const without = buildMinimaxPayload(req());

  assert.deepEqual(withEnd.content[1], without.content[1]); // first_frame 不動
  assert.deepEqual(withEnd.content[2], {
    type: "image_url",
    image_url: { url: JPG },
    role: "last_frame",
  });
  assert.equal(withEnd.content.length, 3);
});

test("t2v 只帶 text,即使傳了結束幀也一樣", () => {
  const p = buildMinimaxPayload(
    req({ mode: "t2v", imageDataUrl: undefined, endImageDataUrl: JPG })
  );
  assert.equal(p.content.length, 1);
  assert.equal(p.content[0].type, "text");
});

test("沒有起始幀時結束幀被忽略 —— 沒有起點的終點不成立", () => {
  const p = buildMinimaxPayload(
    req({ imageDataUrl: undefined, endImageDataUrl: JPG })
  );
  assert.equal(p.content.length, 1);
  assert.equal(p.content.some((c) => c.role === "last_frame"), false);
  assert.equal(p.content.some((c) => c.role === "first_frame"), false);
});

test("V2 也收公開 http URL 當參考圖(與 Veo 只吃 base64 不同)", () => {
  const url = "https://example.com/start.png";
  const p = buildMinimaxPayload(req({ imageDataUrl: url }));
  assert.deepEqual(p.content[1], {
    type: "image_url",
    image_url: { url },
    role: "first_frame",
  });
});

test("resolution 可覆寫(2K)", () => {
  assert.equal(buildMinimaxPayload(req(), "2K").resolution, "2K");
});

test("duration 夾到 4–15 並取整", () => {
  assert.equal(buildMinimaxPayload(req({ durationSec: 2 })).duration, 4);
  assert.equal(buildMinimaxPayload(req({ durationSec: 20 })).duration, 15);
  assert.equal(buildMinimaxPayload(req({ durationSec: 7.4 })).duration, 7);
});

// --- 註冊表:引擎能力 ---

test("H3 不設 allowedDurations,snapDuration 維持原值(接受連續整數)", () => {
  assert.equal(snapDuration("MiniMax-H3", 7), 7);
  assert.equal(snapDuration("MiniMax-H3", 13), 13);
});

test("H3 支援 16:9 / 9:16 / 1:1", () => {
  assert.deepEqual(supportedAspects("MiniMax-H3"), ["16:9", "9:16", "1:1"]);
});
