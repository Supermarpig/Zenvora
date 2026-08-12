/**
 * Seedance(即夢 2.0)影片 Provider —— 火山引擎 CV 官方 API。
 *
 * 移植/改寫自開源專案 wind-comic(MIT, © 2026 ChrisChen667788),
 * 適配成本專案的 `VideoProvider`(submit / poll)介面。
 * https://github.com/ChrisChen667788/wind-comic
 *
 * 非同步任務流:CVSync2AsyncSubmitTask(送出)→ 輪詢 CVSync2AsyncGetResult。
 * 因為 poll 需要同時帶 reqKey + taskId,而本專案的 poll 只吃一個字串,
 * 故把兩者編碼成 providerJobId = `${reqKey}::${taskId}`。
 *
 * 環境變數:JIMENG_AK / JIMENG_SK(見 jimeng-signer.ts)。
 *
 * ⚠️ 圖生影片限制:火山 API 的參考圖需為「公開 http(s) URL」。本專案的關鍵幀圖存在
 * 瀏覽器本地(data: URL),尚無公開圖床 → 目前 data: URL 會被略過、退回文生影片。
 * 要跑圖生影片需先加一層把圖上傳到物件儲存(R2/TOS)拿到 URL 的步驟(未來工作)。
 */

import { signRequest, getJimengCredentials } from "./jimeng-signer";
import type { VideoGenRequest, VideoJobState, VideoProvider } from "./types";

const HOST = "visual.volcengineapi.com";
const PATH = "/";
const API_VERSION = "2022-08-31";
const SUBMIT_ACTION = "CVSync2AsyncSubmitTask";
const RESULT_ACTION = "CVSync2AsyncGetResult";

/** req_key 集中管理(即夢模型升級只改這裡) */
const REQ_KEY = {
  t2v: "jimeng_vgfm_t2v_l20",
  i2v: "jimeng_vgfm_i2v_l21",
  av: "jimeng_vgfm_av_l10",
} as const;

const ALLOWED_DURATIONS = [4, 5, 8, 10, 15] as const;

function nearestDuration(sec: number): number {
  return ALLOWED_DURATIONS.reduce(
    (best, d) => (Math.abs(d - sec) < Math.abs(best - sec) ? d : best),
    ALLOWED_DURATIONS[0]
  );
}

function isHttp(u?: string): u is string {
  return !!u && /^https?:\/\//.test(u);
}

function safeSlice(v: unknown): string {
  try {
    return JSON.stringify(v).slice(0, 400);
  } catch {
    return String(v);
  }
}

/** 從火山回應撈 task_id(相容多種欄位路徑) */
function extractTaskId(data: unknown): string | undefined {
  const d = data as Record<string, unknown> & {
    Result?: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
  const r = d?.Result ?? d?.data ?? d ?? {};
  return (
    (r.task_id as string) ??
    (r.TaskId as string) ??
    (d?.task_id as string) ??
    undefined
  );
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** 把火山查詢結果解析成本專案的 VideoJobState */
function parseResult(data: unknown): VideoJobState {
  const d = asRecord(data);
  const err = asRecord(asRecord(d.ResponseMetadata).Error);
  const bizErr =
    (err.Code as string | undefined) ??
    (typeof d.code === "number" && d.code !== 0 && d.code !== 10000
      ? (d.message as string)
      : undefined);
  if (bizErr) return { status: "failed", error: String(bizErr) };

  const inner = asRecord(d.Result ?? d.data ?? d);
  const status = String(
    inner.status ?? inner.Status ?? inner.task_status ?? "unknown"
  ).toLowerCase();

  if (status === "done" || status === "success" || status === "succeeded") {
    const urls = inner.video_urls;
    const videoUri =
      (inner.video_url as string | undefined) ??
      (inner.videoUrl as string | undefined) ??
      (Array.isArray(urls) ? (urls[0] as string) : undefined);
    if (!videoUri) return { status: "failed", error: "完成但無 video_url" };
    return { status: "succeeded", videoUri };
  }

  if (["failed", "error", "not_found", "expired"].includes(status)) {
    return {
      status: "failed",
      error: String(inner.message ?? inner.fail_reason ?? status),
    };
  }

  // in_queue / generating / pending / running → 本專案輪詢器以 "running" 續跑
  return { status: "running" };
}

async function callVolc(
  action: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const { accessKey, secretKey, region, service } = getJimengCredentials();
  if (!accessKey || !secretKey) {
    throw new Error("請先設定 JIMENG_AK / JIMENG_SK 環境變數");
  }

  const bodyStr = JSON.stringify(body);
  const query = { Action: action, Version: API_VERSION };
  const signed = signRequest({
    method: "POST",
    host: HOST,
    path: PATH,
    query,
    headers: { "content-type": "application/json" },
    body: bodyStr,
    accessKey,
    secretKey,
    region,
    service,
  });

  const res = await fetch(
    `https://${HOST}${PATH}?Action=${action}&Version=${API_VERSION}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: HOST,
        "X-Date": signed.xDate,
        "X-Content-Sha256": signed.headers["x-content-sha256"],
        Authorization: signed.authorization,
      },
      body: bodyStr,
    }
  );

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export function createSeedanceProvider(): VideoProvider {
  return {
    id: "seedance",
    // 火山產出的是公開 CDN URL,不需帶 key,但仍走代理避免瀏覽器 CORS
    needsProxyDownload: true,

    async submit(req: VideoGenRequest): Promise<{ providerJobId: string }> {
      // 只收公開 http(s) 參考圖;本地 data: URL 目前略過(見檔頭說明)
      const refs = isHttp(req.imageDataUrl) ? [req.imageDataUrl] : [];

      const reqKey = req.withAudio
        ? REQ_KEY.av
        : refs.length
        ? REQ_KEY.i2v
        : REQ_KEY.t2v;

      const body: Record<string, unknown> = {
        req_key: reqKey,
        prompt: req.prompt,
        duration: nearestDuration(req.durationSec),
        resolution: "720p",
        aspect_ratio: req.aspectRatio,
      };
      if (refs.length) {
        body.image_urls = refs;
        body.first_frame_image = refs[0];
      }
      if (req.withAudio) body.native_audio = true;

      const { ok, status, json } = await callVolc(SUBMIT_ACTION, body);
      if (!ok) {
        throw new Error(`Seedance 送出失敗 ${status}: ${safeSlice(json)}`);
      }
      const taskId = extractTaskId(json);
      if (!taskId) {
        throw new Error(`Seedance 未回傳 task_id: ${safeSlice(json)}`);
      }
      return { providerJobId: `${reqKey}::${taskId}` };
    },

    async poll(providerJobId: string): Promise<VideoJobState> {
      const sep = providerJobId.indexOf("::");
      if (sep < 0) {
        return { status: "failed", error: "providerJobId 格式錯誤" };
      }
      const reqKey = providerJobId.slice(0, sep);
      const taskId = providerJobId.slice(sep + 2);

      const { ok, status, json } = await callVolc(RESULT_ACTION, {
        req_key: reqKey,
        task_id: taskId,
      });
      if (!ok) {
        return { status: "failed", error: `輪詢失敗 ${status}: ${safeSlice(json)}` };
      }
      return parseResult(json);
    },
  };
}
