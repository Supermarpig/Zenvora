import { createVeoProvider } from "./veo-provider";
import { createSeedanceProvider } from "./seedance-provider";
import { createKlingProvider } from "./kling-provider";
import type { VideoModelOption, VideoProvider } from "./types";

/**
 * Provider registry。新增引擎只要在這裡註冊一個實作 `VideoProvider` 的 adapter,
 * 並在下方 VIDEO_MODELS 列一筆,UI 端不需改動。
 */
const providers: Record<string, VideoProvider> = {
  veo: createVeoProvider(),
  seedance: createSeedanceProvider(),
  kling: createKlingProvider(),
};

export function getProvider(id: string): VideoProvider {
  const p = providers[id];
  if (!p) throw new Error(`未知的影片 provider: ${id}`);
  return p;
}

/** 依 model 找 provider(model → providerId 對照見 VIDEO_MODELS) */
export function getProviderForModel(model: string): VideoProvider {
  const opt = VIDEO_MODELS.find((m) => m.model === model);
  return getProvider(opt?.providerId ?? "veo");
}

/**
 * UI 下拉可選的影片模型。
 * creditCost = 相對「每秒」成本指標,依 2026-03 各家官方每秒定價估算(× 秒數才是實際花費):
 *   Veo 3 標準 ≈ $0.40/s、Veo 3 Fast ≈ $0.15/s、Seedance 2.0 ≈ $0.14/s(火山「1 元/秒」)。
 * 注意:Seedance 2.0 並不便宜,約等於 Veo Fast;真正便宜的是 Veo Fast。價格會變,請以官方為準。
 */
export const VIDEO_MODELS: VideoModelOption[] = [
  {
    providerId: "veo",
    model: "veo-3.1-generate-preview",
    label: "Veo 3.1（Google · 品質最高 · 貴）",
    supportsImage: true,
    supportsAudio: true,
    creditCost: 40,
  },
  {
    providerId: "veo",
    model: "veo-3.1-fast-generate-preview",
    label: "Veo 3.1 Fast（Google · 最省 ~$0.15/s）",
    supportsImage: true,
    supportsAudio: true,
    creditCost: 15,
  },
  {
    providerId: "seedance",
    model: "seedance-2.0",
    label: "Seedance 2.0（字節/火山 · ~$0.14/s）",
    supportsImage: true,
    supportsAudio: true,
    creditCost: 14,
  },
  {
    // Kling 價格隨版本/檔位(std/pro/4K)差很多,std 約 $0.11/s 起,故只給約略中間值
    providerId: "kling",
    model: "kling-v3",
    label: "Kling 3（快手/可灵 · 中文理解強）",
    supportsImage: true,
    supportsAudio: false,
    creditCost: 28,
  },
];

export const DEFAULT_VIDEO_MODEL = VIDEO_MODELS[0].model;

export function getModelOption(model: string): VideoModelOption | undefined {
  return VIDEO_MODELS.find((m) => m.model === model);
}
