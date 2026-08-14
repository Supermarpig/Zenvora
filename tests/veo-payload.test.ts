import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVeoPayload } from "../src/lib/video/veo-provider.ts";
import { snapDuration, supportedAspects } from "../src/lib/video/index.ts";
import type { VideoGenRequest } from "../src/lib/video/types.ts";

/**
 * 首尾關鍵幀最大的風險不是「結束幀沒生效」,而是**改壞現有的圖生影片**。
 * 生影片沒有免費額度,壞了不會有人在開發時發現,所以這條回歸要有測試釘著。
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
    model: "veo-3.1-generate-preview",
    ...over,
  };
}

test("沒有結束幀時,instance 只有 prompt 與 image(防回歸)", () => {
  const { instances } = buildVeoPayload(req());
  assert.deepEqual(Object.keys(instances[0]).sort(), ["image", "prompt"]);
  assert.equal("lastFrame" in instances[0], false);
});

test("傳 undefined 結束幀與完全不傳等價", () => {
  assert.deepEqual(
    buildVeoPayload(req({ endImageDataUrl: undefined })),
    buildVeoPayload(req())
  );
});

test("有結束幀時加上 lastFrame,且 image 不變", () => {
  const withEnd = buildVeoPayload(req({ endImageDataUrl: JPG }));
  const without = buildVeoPayload(req());

  assert.deepEqual(withEnd.instances[0].image, without.instances[0].image);
  assert.deepEqual(withEnd.instances[0].lastFrame, {
    bytesBase64Encoded: "/9j/4AAQSkZJRg",
    mimeType: "image/jpeg",
  });
  // parameters 不該因為結束幀而變動
  assert.deepEqual(withEnd.parameters, without.parameters);
});

test("t2v 不帶任何幀,即使傳了結束幀也一樣", () => {
  const { instances } = buildVeoPayload(
    req({ mode: "t2v", imageDataUrl: undefined, endImageDataUrl: JPG })
  );
  assert.deepEqual(Object.keys(instances[0]), ["prompt"]);
});

test("沒有起始幀時結束幀被忽略 —— 沒有起點的終點不成立", () => {
  const { instances } = buildVeoPayload(
    req({ imageDataUrl: undefined, endImageDataUrl: JPG })
  );
  assert.equal("lastFrame" in instances[0], false);
  assert.equal("image" in instances[0], false);
});

test("不是 data URL 的結束幀不會被塞進 payload", () => {
  const { instances } = buildVeoPayload(
    req({ endImageDataUrl: "https://example.com/end.png" })
  );
  assert.equal("lastFrame" in instances[0], false);
});

// --- 引擎能力:秒數與比例 ---

test("snapDuration:Veo 吸附到 4 / 6 / 8", () => {
  const veo = "veo-3.1-generate-preview";
  assert.equal(snapDuration(veo, 4), 4);
  assert.equal(snapDuration(veo, 5), 4); // 距離相同時取先出現的
  assert.equal(snapDuration(veo, 6), 6);
  assert.equal(snapDuration(veo, 7), 6);
  assert.equal(snapDuration(veo, 8), 8);
  assert.equal(snapDuration(veo, 15), 8);
});

test("snapDuration:沒有 allowedDurations 的引擎維持原值", () => {
  assert.equal(snapDuration("seedance-2.0", 5), 5);
  assert.equal(snapDuration("kling-v3", 13), 13);
});

test("snapDuration:未知 model 維持原值,不要意外改動", () => {
  assert.equal(snapDuration("nonexistent-model", 7), 7);
});

test("supportedAspects:Veo 不含 1:1", () => {
  assert.deepEqual(supportedAspects("veo-3.1-generate-preview"), [
    "16:9",
    "9:16",
  ]);
  assert.ok(!supportedAspects("veo-3.1-fast-generate-preview").includes("1:1"));
});

test("supportedAspects:未知 model 回全部,不要把 UI 清空", () => {
  assert.deepEqual(supportedAspects("nonexistent-model"), [
    "16:9",
    "9:16",
    "1:1",
  ]);
});
