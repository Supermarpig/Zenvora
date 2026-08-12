import { createVeoProvider } from "./veo-provider";
import type { VideoModelOption, VideoProvider } from "./types";

/**
 * Provider registry。目前只有 Veo;之後接 fal.ai 就在這裡多註冊一個 adapter,
 * UI 端不需改動。
 */
const providers: Record<string, VideoProvider> = {
  veo: createVeoProvider(),
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

/** UI 下拉可選的影片模型(先只有 Veo,fal 接上後補) */
export const VIDEO_MODELS: VideoModelOption[] = [
  {
    providerId: "veo",
    model: "veo-3.1-generate-preview",
    label: "Veo 3.1（Google · 原生音訊）",
    supportsImage: true,
    supportsAudio: true,
    creditCost: 40,
  },
  {
    providerId: "veo",
    model: "veo-3.1-fast-generate-preview",
    label: "Veo 3.1 Fast（Google · 較快）",
    supportsImage: true,
    supportsAudio: true,
    creditCost: 20,
  },
];

export const DEFAULT_VIDEO_MODEL = VIDEO_MODELS[0].model;

export function getModelOption(model: string): VideoModelOption | undefined {
  return VIDEO_MODELS.find((m) => m.model === model);
}
