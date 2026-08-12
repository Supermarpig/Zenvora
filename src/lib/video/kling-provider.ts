/**
 * Kling(可灵,快手)影片 Provider —— 官方開放平台直連。
 *
 * 端點/欄位參考自開源專案 wind-comic(MIT, © 2026 ChrisChen667788),
 * 認證改為官方要求的 JWT(ak/sk 簽 HS256),適配成本專案的 `VideoProvider`。
 * https://github.com/ChrisChen667788/wind-comic
 *
 * 認證:Authorization: Bearer <JWT>,JWT = HS256 簽 { iss: ak, exp, nbf }(sk 當金鑰),短期有效。
 * 端點:POST /v1/videos/{text2video|image2video} → {task_id};GET 同路徑/{id} 查狀態。
 * poll 需要知道當初走 t2v 還是 i2v(查詢路徑不同)→ providerJobId = `${kind}::${taskId}`。
 *
 * ✅ 圖生影片:Kling 的 image 欄位收「URL 或純 base64」,所以本專案本地的關鍵幀
 *    (data:image/... base64)可直接用,不需先上圖床。
 *
 * 環境變數:KLING_ACCESS_KEY / KLING_SECRET_KEY(必填)、KLING_BASE_URL、KLING_VIDEO_MODEL(選填)
 */

import { createHmac } from "crypto";
import type { VideoGenRequest, VideoJobState, VideoProvider } from "./types";

const DEFAULT_BASE = "https://api-singapore.klingai.com"; // 國際站;大陸站用 api-beijing.klingai.com

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** 依官方規格用 ak/sk 簽一枚短期 JWT 當 Bearer */
function signKlingJwt(ak: string, sk: string): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({ iss: ak, exp: now + 1800, nbf: now - 5 })
  );
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", sk).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

function creds() {
  return {
    ak: process.env.KLING_ACCESS_KEY || "",
    sk: process.env.KLING_SECRET_KEY || "",
    base: process.env.KLING_BASE_URL || DEFAULT_BASE,
    model: process.env.KLING_VIDEO_MODEL || "kling-v3",
  };
}

function klingDuration(sec: number, model: string): string {
  const max = model.startsWith("kling-v3") ? 15 : 10;
  if (sec > 10 && max >= 15) return "15";
  if (sec > 5) return "10";
  return "5";
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

export function createKlingProvider(): VideoProvider {
  return {
    id: "kling",
    needsProxyDownload: true,

    async submit(req: VideoGenRequest): Promise<{ providerJobId: string }> {
      const { ak, sk, base, model } = creds();
      if (!ak || !sk) {
        throw new Error("請先設定 KLING_ACCESS_KEY / KLING_SECRET_KEY");
      }

      // 圖:data:image → 剝成純 base64;http → 直接用;其餘 → 走文生
      let image: string | undefined;
      const u = req.imageDataUrl;
      if (u?.startsWith("data:image/")) image = u.split(",")[1];
      else if (u && /^https?:\/\//.test(u)) image = u;

      const kind = image ? "image2video" : "text2video";
      const prompt =
        req.prompt.length > 2450 ? req.prompt.slice(0, 2450) : req.prompt;

      const body: Record<string, unknown> = {
        model_name: model,
        prompt,
        mode: "std", // std | pro(pro 較貴);Kling 原生音效不穩,建議聲音走 TTS
        duration: klingDuration(req.durationSec, model),
        aspect_ratio: req.aspectRatio,
      };
      if (image) body.image = image;

      const res = await fetch(`${base}/v1/videos/${kind}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${signKlingJwt(ak, sk)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`Kling 送出失敗 ${res.status}: ${safeSlice(json)}`);
      }
      const data = asRecord(asRecord(json).data);
      const taskId =
        (data.task_id as string) ??
        (asRecord(json).task_id as string) ??
        undefined;
      if (!taskId) {
        throw new Error(`Kling 未回傳 task_id: ${safeSlice(json)}`);
      }
      return { providerJobId: `${kind}::${taskId}` };
    },

    async poll(providerJobId: string): Promise<VideoJobState> {
      const { ak, sk, base } = creds();
      const sep = providerJobId.indexOf("::");
      if (sep < 0) return { status: "failed", error: "providerJobId 格式錯誤" };
      const kind = providerJobId.slice(0, sep);
      const taskId = providerJobId.slice(sep + 2);

      const res = await fetch(`${base}/v1/videos/${kind}/${taskId}`, {
        headers: { Authorization: `Bearer ${signKlingJwt(ak, sk)}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { status: "failed", error: `輪詢失敗 ${res.status}: ${safeSlice(json)}` };
      }

      const data = asRecord(asRecord(json).data ?? json);
      const status = String(data.task_status ?? data.status ?? "").toLowerCase();

      if (["succeed", "success", "completed"].includes(status)) {
        const result = asRecord(data.task_result);
        const videos = result.videos;
        const videoUri = Array.isArray(videos)
          ? (asRecord(videos[0]).url as string | undefined)
          : undefined;
        if (!videoUri) return { status: "failed", error: "完成但無影片 URL" };
        return { status: "succeeded", videoUri };
      }
      if (["failed", "cancelled"].includes(status)) {
        return {
          status: "failed",
          error: String(data.task_status_msg ?? "生成失敗"),
        };
      }
      return { status: "running" };
    },
  };
}
