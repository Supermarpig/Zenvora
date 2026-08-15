import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveVideoStatus } from "../src/lib/video-status.ts";

/**
 * §16 D9 收斂後,影片 UI 狀態只從這一個純函式導出。這裡釘住幾條「兩份狀態各自
 * 更新時最容易錯」的組合 —— 這些正是先前 frame.videoStatus 與 VideoJob.status
 * 不同步會出現的縫隙。
 */

test("沒有 job、沒有成片、沒有錯 → none", () => {
  assert.equal(
    deriveVideoStatus({ videoStatus: "none", hasVideoKey: false }),
    "none"
  );
  assert.equal(deriveVideoStatus({ hasVideoKey: false }), "none");
});

test("videoStatus running → running", () => {
  assert.equal(
    deriveVideoStatus({ videoStatus: "running", hasVideoKey: false }),
    "running"
  );
});

test("queued 併入 running(UI 不區分排隊/生成)", () => {
  assert.equal(
    deriveVideoStatus({ videoStatus: "queued", hasVideoKey: false }),
    "running"
  );
});

test("有 videoKey → succeeded", () => {
  assert.equal(
    deriveVideoStatus({ videoStatus: "succeeded", hasVideoKey: true }),
    "succeeded"
  );
  // 即使 videoStatus 還沒被更新成 succeeded,只要有檔就是成功
  assert.equal(deriveVideoStatus({ hasVideoKey: true }), "succeeded");
});

test("provider 已回報成功、但檔案還在下載(status 仍 running、尚無 videoKey)→ running,不是 none", () => {
  assert.equal(
    deriveVideoStatus({ videoStatus: "running", hasVideoKey: false }),
    "running"
  );
});

test("重生成進行中即使還留著舊 videoKey → running 優先於 succeeded", () => {
  assert.equal(
    deriveVideoStatus({ videoStatus: "running", hasVideoKey: true }),
    "running"
  );
});

test("videoStatus failed、無成片 → failed", () => {
  assert.equal(
    deriveVideoStatus({ videoStatus: "failed", hasVideoKey: false }),
    "failed"
  );
});

test("即時 localError → failed(即使 frame 還沒寫入 failed)", () => {
  assert.equal(
    deriveVideoStatus({ videoStatus: "none", hasVideoKey: false, localError: true }),
    "failed"
  );
});

test("有成片時,殘留的 failed 不該蓋掉 succeeded", () => {
  // videoKey 優先於 failed —— 有檔就是成功,舊的 failed 標記不算
  assert.equal(
    deriveVideoStatus({ videoStatus: "failed", hasVideoKey: true }),
    "succeeded"
  );
});
