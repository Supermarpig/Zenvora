import { createVeoProvider } from "./veo-provider";
import { createSeedanceProvider } from "./seedance-provider";
import { createKlingProvider } from "./kling-provider";
import type {
  VideoAspectRatio,
  VideoModelOption,
  VideoProvider,
} from "./types";

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
    supportsEndFrame: true,
    // Veo 官方只列 16:9 與 9:16 —— 先前 UI 提供 1:1,選了會被 API 打回來
    supportedAspects: ["16:9", "9:16"],
    // 官方只接受 4 / 6 / 8 秒
    allowedDurations: [4, 6, 8],
    creditCost: 40,
  },
  {
    providerId: "veo",
    model: "veo-3.1-fast-generate-preview",
    label: "Veo 3.1 Fast（Google · 最省 ~$0.15/s）",
    supportsImage: true,
    supportsAudio: true,
    supportsEndFrame: true,
    supportedAspects: ["16:9", "9:16"],
    allowedDurations: [4, 6, 8],
    creditCost: 15,
  },
  {
    // ⚠️ 這一筆是**即夢 VGFM**,不是 Seedance 2.0 —— 兩者都是字節的產品但走完全不同的
    // API:即夢在 visual.volcengineapi.com(req_key `jimeng_vgfm_*`),Seedance 2.0 在
    // 火山方舟(Ark)。標籤先前寫「Seedance 2.0」是誤導,已改正。
    //
    // `model` 這個字串**刻意不改** —— 它是註冊表的 key 且被持久化在
    // `frame.videoModel` 與 model-config store 裡,改了會讓既有資料查不到選項,
    // 而 `getProviderForModel` 對未知 model 會靜默退回 veo(送錯 provider)。
    //
    // 真要接 Seedance 2.0(它才支援參考影片/動作遷移)是**新增一個 provider**,
    // 見 bigbanana-parity-spec.md §19。
    providerId: "seedance",
    model: "seedance-2.0",
    label: "即夢 2.0（字節/火山 · ~$0.14/s）",
    supportsImage: true,
    supportsAudio: true,
    // 即夢 VGFM 沒有結束幀參數(Seedance 2.0 才有參考影片,但那是另一個 API)
    supportsEndFrame: false,
    supportedAspects: ["16:9", "9:16", "1:1"],
    creditCost: 14,
  },
  {
    // Kling 價格隨版本/檔位(std/pro/4K)差很多,std 約 $0.11/s 起,故只給約略中間值
    providerId: "kling",
    model: "kling-v3",
    label: "Kling 3（快手/可灵 · 中文理解強）",
    supportsImage: true,
    supportsAudio: false,
    // Kling 據稱有 image_tail,但沒有帳號無從查證欄位名,先不宣稱支援
    supportsEndFrame: false,
    supportedAspects: ["16:9", "9:16", "1:1"],
    creditCost: 28,
  },
];

export const DEFAULT_VIDEO_MODEL = VIDEO_MODELS[0].model;

export function getModelOption(model: string): VideoModelOption | undefined {
  return VIDEO_MODELS.find((m) => m.model === model);
}

/**
 * 把使用者設定的秒數吸附到引擎接受的值。
 *
 * Veo 只接受 4 / 6 / 8 秒,但分鏡的 `duration` 是 4–15 的連續值 —— 先前直接
 * 送出去,5 秒、7 秒之類都會被 API 打回來。沒有 `allowedDurations` 的引擎
 * 維持原值不動。
 */
export function snapDuration(model: string, durationSec: number): number {
  const allowed = getModelOption(model)?.allowedDurations;
  if (!allowed?.length) return durationSec;
  return allowed.reduce((best, v) =>
    Math.abs(v - durationSec) < Math.abs(best - durationSec) ? v : best
  );
}

/** 引擎接受的畫面比例;找不到選項時回全部(不要因此把 UI 清空) */
export function supportedAspects(model: string): VideoAspectRatio[] {
  return getModelOption(model)?.supportedAspects ?? ["16:9", "9:16", "1:1"];
}
