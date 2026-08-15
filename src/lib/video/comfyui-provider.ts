import type { VideoGenRequest, VideoJobState, VideoProvider } from "./types";

/**
 * 本地 ComfyUI + LTX-2 影片 provider(圖生影片・免費・跑在使用者 Mac 上)。
 *
 * 為什麼是這條路:Draw Things 的 API 做不到 i2v —— HTTP 相容層把「影片(txt2img)」
 * 與「起始圖(img2img)」分死,gRPC 又有已知 crash(社群 issue #56,一送 GenerateImage
 * 就崩)。ComfyUI 的 HTTP API 正常,且已驗證這台 M3 能跑 LTX-2 GGUF i2v。
 *
 * 這個 adapter 走 server 端打 ComfyUI:submit 上傳起始圖 + 送 workflow → 回 prompt_id;
 * poll 查 /history。成片留在 ComfyUI 的 output,videoUri 指向它的 /view ——
 * **needsProxyDownload = false**,前端直接抓(ComfyUI 已開 CORS),不走 /api/video 代理
 * (代理只放行雲端 https 白名單,localhost http 會被 SSRF 防護擋掉)。
 *
 * workflow 對照使用者既有的 `LTX2-Mac-GGUF-Image2Video.json`(已驗證可行的 Mac GGUF 配置)。
 * 模型檔名寫死成該機下載好的那幾顆;換機時用 env 覆寫 base、或更新這裡。
 */

const BASE = (process.env.COMFYUI_URL || "http://127.0.0.1:8188").replace(
  /\/+$/,
  ""
);

// 已驗證可行的 Mac GGUF LTX-2 模型檔(在使用者的 ComfyUI/models 下)
const UNET = "ltx-2-19b-distilled_Q4_K_M.gguf";
const CLIP1 = "gemma-3-12b-it-Q4_K_M.gguf";
const CLIP2 = "ltx-2-19b-embeddings_connector_distill_bf16.safetensors";
const VAE = "LTX2_video_vae_bf16.safetensors";
const FPS = 24;
const NEG =
  "blurry, low quality, watermark, text, static image, still frame, distorted";

/** 比例 → 像素(皆 32 的倍數,LTX 要求);沿用驗證過的 640×384 量級 */
function dims(aspect: VideoGenRequest["aspectRatio"]): { w: number; h: number } {
  if (aspect === "9:16") return { w: 384, h: 640 };
  if (aspect === "1:1") return { w: 512, h: 512 };
  return { w: 640, h: 384 }; // 16:9
}

/** 秒數 → 幀數:LTX 需 8k+1;夾在 25(~1s)~97(~4s)避免 Mac 上太久 */
function frames(sec: number): number {
  const n = Math.round(sec * FPS);
  const snapped = 8 * Math.round((n - 1) / 8) + 1;
  return Math.max(25, Math.min(97, snapped));
}

function dataUrlToBytes(dataUrl: string): { buffer: ArrayBuffer; mime: string } {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) throw new Error("起始圖格式不是 data URL");
  const buf = Buffer.from(m[2], "base64");
  // 切出獨立 ArrayBuffer(避開 Node Buffer pool 的共享 offset,且滿足 BlobPart 型別)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return { buffer: ab, mime: m[1] };
}

async function uploadImage(dataUrl: string): Promise<string> {
  const { buffer, mime } = dataUrlToBytes(dataUrl);
  const ext = mime.includes("png") ? "png" : mime.includes("jpeg") ? "jpg" : "png";
  const fd = new FormData();
  // 隨機檔名避免多鏡互相覆蓋
  const name = `ff-i2v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  fd.append("image", new Blob([buffer], { type: mime }), name);
  fd.append("overwrite", "true");
  const res = await fetch(`${BASE}/upload/image`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`ComfyUI 上傳圖片失敗 ${res.status}`);
  const j = (await res.json()) as { name: string; subfolder?: string };
  return j.subfolder ? `${j.subfolder}/${j.name}` : j.name;
}

function buildWorkflow(
  imageName: string,
  prompt: string,
  w: number,
  h: number,
  length: number
): Record<string, { class_type: string; inputs: Record<string, unknown> }> {
  const seed = Math.floor(Math.random() * 2 ** 31);
  return {
    "1": { class_type: "UnetLoaderGGUF", inputs: { unet_name: UNET } },
    "3": { class_type: "VAELoader", inputs: { vae_name: VAE } },
    "21": {
      class_type: "DualCLIPLoaderGGUF",
      inputs: { clip_name1: CLIP1, clip_name2: CLIP2, type: "ltxv" },
    },
    "4": { class_type: "LoadImage", inputs: { image: imageName } },
    "5": {
      class_type: "CLIPTextEncode",
      inputs: { text: prompt, clip: ["21", 0] },
    },
    "6": { class_type: "CLIPTextEncode", inputs: { text: NEG, clip: ["21", 0] } },
    "7": {
      class_type: "LTXVConditioning",
      inputs: { positive: ["5", 0], negative: ["6", 0], frame_rate: FPS },
    },
    "8": {
      class_type: "LTXVImgToVideo",
      inputs: {
        positive: ["7", 0],
        negative: ["7", 1],
        vae: ["3", 0],
        image: ["4", 0],
        width: w,
        height: h,
        length,
        batch_size: 1,
        strength: 1.0,
      },
    },
    "9": {
      class_type: "ModelSamplingLTXV",
      inputs: { model: ["1", 0], max_shift: 2.05, base_shift: 0.95 },
    },
    "10": {
      class_type: "KSampler",
      inputs: {
        model: ["9", 0],
        seed,
        steps: 20,
        cfg: 3.5,
        sampler_name: "euler",
        scheduler: "normal",
        positive: ["8", 0],
        negative: ["8", 1],
        latent_image: ["8", 2],
        denoise: 1.0,
      },
    },
    "11": {
      class_type: "VAEDecodeTiled",
      inputs: {
        samples: ["10", 0],
        vae: ["3", 0],
        tile_size: 256,
        overlap: 64,
        temporal_size: 64,
        temporal_overlap: 8,
      },
    },
    "12": {
      class_type: "VHS_VideoCombine",
      inputs: {
        images: ["11", 0],
        frame_rate: FPS,
        loop_count: 0,
        filename_prefix: "frameforge-i2v",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        trim_to_audio: false,
        pingpong: false,
        save_output: true,
      },
    },
  };
}

export function createComfyuiProvider(): VideoProvider {
  return {
    id: "comfyui",
    // 成片在本機 ComfyUI 的 /view;CORS 已開,前端直接抓,不走雲端代理
    needsProxyDownload: false,

    async submit(req: VideoGenRequest): Promise<{ providerJobId: string }> {
      if (!req.imageDataUrl) {
        throw new Error("本地 LTX 是圖生影片,需要先有起始圖(關鍵幀)");
      }
      const imageName = await uploadImage(req.imageDataUrl);
      const { w, h } = dims(req.aspectRatio);
      const wf = buildWorkflow(
        imageName,
        req.prompt,
        w,
        h,
        frames(req.durationSec)
      );
      const res = await fetch(`${BASE}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: wf }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`ComfyUI 送出失敗 ${res.status}: ${body.slice(0, 300)}`);
      }
      const j = (await res.json()) as { prompt_id?: string; error?: unknown };
      if (!j.prompt_id) throw new Error("ComfyUI 未回傳 prompt_id(workflow 可能有誤)");
      return { providerJobId: j.prompt_id };
    },

    async poll(providerJobId: string): Promise<VideoJobState> {
      // 先看 /history:有紀錄代表跑完(成功或失敗)
      const hres = await fetch(`${BASE}/history/${providerJobId}`);
      if (hres.ok) {
        const hist = (await hres.json()) as Record<
          string,
          {
            status?: { status_str?: string; completed?: boolean };
            outputs?: Record<
              string,
              { gifs?: VhsOut[]; videos?: VhsOut[] }
            >;
          }
        >;
        const h = hist[providerJobId];
        if (h) {
          const statusStr = h.status?.status_str;
          if (statusStr === "error") {
            return { status: "failed", error: "ComfyUI 生成失敗(見 ComfyUI log)" };
          }
          const outs = h.outputs ?? {};
          for (const node of Object.values(outs)) {
            const vid = (node.gifs ?? []).concat(node.videos ?? [])[0];
            if (vid) {
              const q = new URLSearchParams({
                filename: vid.filename,
                type: vid.type || "output",
                subfolder: vid.subfolder || "",
              });
              return { status: "succeeded", videoUri: `${BASE}/view?${q}` };
            }
          }
          // 有 history 但沒抓到影片 —— 視為失敗,別無限輪詢
          return { status: "failed", error: "ComfyUI 完成但沒有影片輸出" };
        }
      }
      // 還沒進 history:看佇列是在跑還是排隊
      try {
        const qres = await fetch(`${BASE}/queue`);
        if (qres.ok) {
          const q = (await qres.json()) as {
            queue_running?: unknown[];
            queue_pending?: unknown[];
          };
          const running = (q.queue_running ?? []).length > 0;
          return { status: running ? "running" : "queued" };
        }
      } catch {
        // ComfyUI 沒開 / 連不上
        return { status: "failed", error: `連不上 ComfyUI(${BASE})` };
      }
      return { status: "running" };
    },
  };
}

interface VhsOut {
  filename: string;
  subfolder?: string;
  type?: string;
}
