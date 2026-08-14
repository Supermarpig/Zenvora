import type { VideoGenRequest, VideoJobState, VideoProvider } from "./types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getKey(): string {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key || key === "your_api_key_here") {
    throw new Error("請先設定 GOOGLE_AI_API_KEY 環境變數");
  }
  return key;
}

function toInline(dataUrl: string): { mimeType: string; data: string } | null {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  return m ? { mimeType: m[1], data: m[2] } : null;
}

/**
 * 從 operation.response 各種可能路徑撈出影片檔 URI(不同 Veo 版本結構略有差異)。
 */
function extractVideoUri(response: unknown): string | undefined {
  const r = response as Record<string, unknown> | undefined;
  if (!r) return undefined;

  const gvr = (r.generateVideoResponse ?? r) as Record<string, unknown>;
  const samples =
    (gvr.generatedSamples as unknown[]) ??
    (gvr.generatedVideos as unknown[]) ??
    (gvr.videos as unknown[]);

  if (Array.isArray(samples) && samples.length) {
    const s = samples[0] as Record<string, unknown>;
    const video = (s.video ?? s) as Record<string, unknown>;
    const uri = (video.uri ?? video.videoUri ?? video.url) as
      | string
      | undefined;
    if (uri) return uri;
  }

  // 保底:深度找第一個含 googleapis 的 uri 欄位
  const stack: unknown[] = [r];
  while (stack.length) {
    const cur = stack.pop();
    if (cur && typeof cur === "object") {
      for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
        if (
          typeof v === "string" &&
          /uri|url/i.test(k) &&
          v.includes("googleapis.com")
        ) {
          return v;
        }
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return undefined;
}

/**
 * 組 Veo 的 request body。
 *
 * 抽成純函式是為了讓「只有起始幀時 payload 與加結束幀之前完全一致」這件事
 * 有測試釘著 —— 這條回歸是首尾關鍵幀最大的風險:改壞了現有的圖生影片會安靜地
 * 變成別的東西,而生影片沒有免費額度,不會有人在開發時發現。
 */
export function buildVeoPayload(req: VideoGenRequest): {
  instances: Record<string, unknown>[];
  parameters: Record<string, unknown>;
} {
  const instance: Record<string, unknown> = { prompt: req.prompt };

  if (req.mode === "i2v" && req.imageDataUrl) {
    const inline = toInline(req.imageDataUrl);
    if (inline) {
      instance.image = {
        bytesBase64Encoded: inline.data,
        mimeType: inline.mimeType,
      };

      // 結束幀只在有起始幀時才加 —— Veo 的 lastFrame 是「從 image 插值到
      // lastFrame」的約束,沒有起點的終點不成立。
      if (req.endImageDataUrl) {
        const end = toInline(req.endImageDataUrl);
        if (end) {
          instance.lastFrame = {
            bytesBase64Encoded: end.data,
            mimeType: end.mimeType,
          };
        }
      }
    }
  }

  return {
    instances: [instance],
    parameters: {
      aspectRatio: req.aspectRatio,
      durationSeconds: req.durationSec,
      personGeneration: "allow_all",
      generateAudio: req.withAudio ?? false,
    },
  };
}

export function createVeoProvider(): VideoProvider {
  return {
    id: "veo",
    needsProxyDownload: true,

    async submit(req: VideoGenRequest): Promise<{ providerJobId: string }> {
      const key = getKey();
      const model = req.model || "veo-3.1-generate-preview";

      const res = await fetch(
        `${API_BASE}/models/${model}:predictLongRunning?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildVeoPayload(req)),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Veo 送出失敗 ${res.status}: ${body.slice(0, 240)}`);
      }

      const json = (await res.json()) as { name?: string };
      if (!json.name) throw new Error("Veo 未回傳 operation name");
      return { providerJobId: json.name };
    },

    async poll(providerJobId: string): Promise<VideoJobState> {
      const key = getKey();
      // operation name 形如 "models/veo-.../operations/xxx" 或 "operations/xxx"
      const res = await fetch(`${API_BASE}/${providerJobId}?key=${key}`);

      if (!res.ok) {
        const body = await res.text();
        return {
          status: "failed",
          error: `輪詢失敗 ${res.status}: ${body.slice(0, 200)}`,
        };
      }

      const json = (await res.json()) as {
        done?: boolean;
        error?: { message?: string };
        response?: unknown;
      };

      if (json.error) {
        return { status: "failed", error: json.error.message ?? "生成失敗" };
      }
      if (!json.done) {
        return { status: "running" };
      }

      const uri = extractVideoUri(json.response);
      if (!uri) {
        return { status: "failed", error: "完成但找不到影片 URI" };
      }
      return { status: "succeeded", videoUri: uri };
    },
  };
}
