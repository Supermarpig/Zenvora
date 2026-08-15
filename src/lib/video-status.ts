/**
 * 影片 UI 狀態的**單一推導來源**(收斂 §16 D9)。
 *
 * 純函式,不碰任何 store 或瀏覽器 API,所以能被 tests/ 直接 import。集中在這裡的
 * 理由:先前狀態同時存在 `frame.videoStatus` 與 `use-job-store` 的 `VideoJob.status`,
 * 兩份值域重疊、各自更新就會矛盾(「job 已成功但分鏡還顯示 running」)。收斂後
 * `frame.videoStatus` 是唯一真相,job store 只留「續輪詢資訊」不再存狀態,推導也只剩這一份。
 */

/** frameSchema.videoStatus 的值域 */
export type FrameVideoStatus =
  | "none"
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

/** 分鏡在 UI 上的影片狀態(UI 不區分排隊/生成,故 queued 併入 running) */
export type VideoUiStatus = "none" | "running" | "succeeded" | "failed";

/**
 * 由「分鏡的持久狀態 + 有沒有成片檔 + 當下的即時錯誤」推導 UI 狀態。
 *
 * 優先序刻意如此:
 * 1. running / queued 最優先 —— 重生成進行中時,即使還留著舊 `videoKey` 也該顯示生成中。
 * 2. 有 `videoKey` → succeeded —— 有成片檔就是成功,不看別的。
 * 3. 即時錯誤或持久的 failed → failed。
 * 4. 其餘 none。
 *
 * 第 1、2 條合起來保證「provider 已回報成功、但檔案還在下載」(此時 videoStatus
 * 仍是 running、videoKey 尚未寫入)顯示為 running 而非 none。
 */
export function deriveVideoStatus(input: {
  videoStatus?: FrameVideoStatus;
  hasVideoKey: boolean;
  localError?: boolean;
}): VideoUiStatus {
  if (input.videoStatus === "running" || input.videoStatus === "queued") {
    return "running";
  }
  if (input.hasVideoKey) return "succeeded";
  if (input.localError || input.videoStatus === "failed") return "failed";
  return "none";
}
