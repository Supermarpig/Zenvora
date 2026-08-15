/**
 * MiniMax H3(海螺 Hailuo 3.0)影片 Provider —— 官方開放平台 V2 API 直連。
 *
 * V2 是**多模態 content 陣列**:一定有一個 text 項;圖生影片再加 image_url 項,
 * 用 `role` 標記 first_frame / last_frame(首尾關鍵幀)。與舊的 v1 `first_frame_image`
 * 欄位不同,H3 只走這個 content 介面。
 *
 * ✅ `image_url.url` 收「公開 http(s) URL / `mm_file://{id}` / base64 data URI」三種 ——
 *    所以本專案本地的關鍵幀(`data:image/...`)可**直接餵**,不需先上圖床
 *    (跟 Kling 一樣;跟即夢 VGFM 需要公開 URL 不同)。故也**不必**像 Kling 那樣把
 *    data URI 剝成純 base64 —— V2 要的就是完整的 data URI。
 *
 * 非同步任務流:POST /v2/video_generation → {task_id};
 * GET /v2/video_generation/{task_id} 查狀態,succeeded 時 `task.content.url`
 * 就是成片 CDN(cdn.hailuoai.com)。成片為公開 CDN 連結、不需帶 key,但仍走
 * /api/video 代理避免瀏覽器 CORS —— 該代理的白名單已放行 hailuoai.com。
 *
 * H3 主打原生音訊(單次生成即帶聲音),V2 沒有音訊開關欄位,故 `withAudio` 不入 payload。
 *
 * 環境變數:
 *   MINIMAX_API_KEY   必填
 *   MINIMAX_BASE_URL  選填,預設國際站 https://api.minimax.io;大陸站用 https://api.minimaxi.com
 *   MINIMAX_RESOLUTION 選填,預設 768P;2K 較貴(官方約 $0.13/秒)
 */

import type { VideoGenRequest, VideoJobState, VideoProvider } from "./types";

const DEFAULT_BASE = "https://api.minimax.io";
const MODEL_ID = "MiniMax-H3";
const MIN_DURATION = 4;
const MAX_DURATION = 15;

function creds() {
  return {
    key: process.env.MINIMAX_API_KEY || "",
    // 去掉尾斜線,避免組出 //v2/... 這種路徑
    base: (process.env.MINIMAX_BASE_URL || DEFAULT_BASE).replace(/\/+$/, ""),
    resolution: process.env.MINIMAX_RESOLUTION || "768P",
  };
}

/** V2 的 image_url.url 收 data URI / http(s) / mm_file:// 三種,其餘視為無圖 */
function isImageRef(u?: string): u is string {
  return (
    !!u &&
    (/^data:image\//.test(u) || /^https?:\/\//.test(u) || u.startsWith("mm_file://"))
  );
}

/** H3 接受 4–15 秒的整數;分鏡的連續秒數在此夾住並取整,不必走 snapDuration */
function clampDuration(sec: number): number {
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(sec)));
}

function imageItem(url: string, role: "first_frame" | "last_frame") {
  return { type: "image_url", image_url: { url }, role };
}

function safeSlice(v: unknown): string {
  try {
    return typeof v === "string" ? v.slice(0, 300) : JSON.stringify(v).slice(0, 300);
  } catch {
    return String(v);
  }
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/**
 * 組 H3 V2 的 request body(純函式,給防回歸測試用)。
 *
 * 抽出來的理由同 Veo:首尾關鍵幀最大的風險是**改壞現有的圖生影片** —— 要有測試
 * 釘住「只有起始幀時 content 不含 last_frame」與「t2v 只帶 text」這兩條。
 */
export function buildMinimaxPayload(
  req: VideoGenRequest,
  resolution = "768P"
): {
  model: string;
  content: Record<string, unknown>[];
  resolution: string;
  duration: number;
  ratio: string;
} {
  const content: Record<string, unknown>[] = [
    { type: "text", text: req.prompt },
  ];

  // 只有 i2v 且有有效起始圖時才加 first_frame
  if (req.mode === "i2v" && isImageRef(req.imageDataUrl)) {
    content.push(imageItem(req.imageDataUrl, "first_frame"));

    // 結束幀只在有起始幀時才加 —— 沒有起點的「插值到終點」不成立
    if (isImageRef(req.endImageDataUrl)) {
      content.push(imageItem(req.endImageDataUrl, "last_frame"));
    }
  }

  return {
    model: MODEL_ID,
    content,
    resolution,
    duration: clampDuration(req.durationSec),
    // 16:9 / 9:16 / 1:1 都是 H3 接受的顯式比例;i2v 也可用顯式比例,不必 adaptive
    ratio: req.aspectRatio,
  };
}

/** 從查詢結果撈成片 URL(相容多種欄位路徑) */
function extractVideoUri(task: Record<string, unknown>): string | undefined {
  const content = asRecord(task.content);
  const file = asRecord(task.file);
  return (
    (content.url as string | undefined) ??
    (content.video_url as string | undefined) ??
    (task.video_url as string | undefined) ??
    (task.download_url as string | undefined) ??
    (file.download_url as string | undefined) ??
    undefined
  );
}

/** 把 V2 查詢結果解析成本專案的 VideoJobState */
function parseResult(json: unknown): VideoJobState {
  const root = asRecord(json);

  // 商業錯誤:即使 HTTP 200,base_resp.status_code 非 0 也算失敗
  const baseResp = asRecord(root.base_resp);
  if (typeof baseResp.status_code === "number" && baseResp.status_code !== 0) {
    return {
      status: "failed",
      error: String(baseResp.status_msg ?? `status_code ${baseResp.status_code}`),
    };
  }

  const task = asRecord(root.task ?? root);
  const status = String(task.status ?? task.task_status ?? "").toLowerCase();

  if (["succeeded", "success", "done", "completed"].includes(status)) {
    const videoUri = extractVideoUri(task);
    if (!videoUri) return { status: "failed", error: "完成但無成片 URL" };
    return { status: "succeeded", videoUri };
  }
  if (["failed", "cancelled", "canceled", "error"].includes(status)) {
    return {
      status: "failed",
      error: String(task.error ?? task.status_msg ?? (status || "生成失敗")),
    };
  }

  // queued / running / preparing / pending → 輪詢器以 "running" 續跑
  return { status: "running" };
}

export function createMinimaxProvider(): VideoProvider {
  return {
    id: "minimax",
    // 成片是公開 CDN(cdn.hailuoai.com),不需帶 key,但仍走代理避免瀏覽器 CORS
    needsProxyDownload: true,

    async submit(req: VideoGenRequest): Promise<{ providerJobId: string }> {
      const { key, base, resolution } = creds();
      if (!key) throw new Error("請先設定 MINIMAX_API_KEY 環境變數");

      const res = await fetch(`${base}/v2/video_generation`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildMinimaxPayload(req, resolution)),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`MiniMax 送出失敗 ${res.status}: ${safeSlice(json)}`);
      }
      const root = asRecord(json);
      // 送出也可能回 base_resp 帶業務錯誤
      const baseResp = asRecord(root.base_resp);
      if (typeof baseResp.status_code === "number" && baseResp.status_code !== 0) {
        throw new Error(
          `MiniMax 送出失敗:${baseResp.status_msg ?? baseResp.status_code}`
        );
      }
      const taskId =
        (root.task_id as string | undefined) ??
        (asRecord(root.task).id as string | undefined);
      if (!taskId) {
        throw new Error(`MiniMax 未回傳 task_id: ${safeSlice(json)}`);
      }
      return { providerJobId: String(taskId) };
    },

    async poll(providerJobId: string): Promise<VideoJobState> {
      const { key, base } = creds();
      const res = await fetch(
        `${base}/v2/video_generation/${encodeURIComponent(providerJobId)}`,
        { headers: { Authorization: `Bearer ${key}` } }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          status: "failed",
          error: `輪詢失敗 ${res.status}: ${safeSlice(json)}`,
        };
      }
      return parseResult(json);
    },
  };
}
