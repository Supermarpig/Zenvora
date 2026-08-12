export type VideoMode = "t2v" | "i2v"; // 文生 / 圖生

export type VideoAspectRatio = "16:9" | "9:16" | "1:1";

export interface VideoGenRequest {
  mode: VideoMode;
  prompt: string;
  /** i2v:起始參考圖 data URL */
  imageDataUrl?: string;
  aspectRatio: VideoAspectRatio;
  durationSec: number;
  withAudio?: boolean;
  /** provider 專屬 model id */
  model: string;
}

export type VideoJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface VideoJobState {
  status: VideoJobStatus;
  progress?: number; // 0..1(部分 provider 沒有)
  /** 完成後的可下載檔案 URL(可能需經代理帶 key 下載) */
  videoUri?: string;
  error?: string;
}

export interface VideoProvider {
  id: string; // "veo" | "fal" | ...
  /** 送出生成任務,回傳 provider 端的 job id(如 Veo operation name) */
  submit(req: VideoGenRequest): Promise<{ providerJobId: string }>;
  /** 輪詢任務狀態 */
  poll(providerJobId: string): Promise<VideoJobState>;
  /** 這個檔案 URI 是否需經 /api/video 代理(帶 key)才能下載 */
  needsProxyDownload: boolean;
}

/** 各 provider 可選的 model 清單(給 UI 下拉用) */
export interface VideoModelOption {
  providerId: string;
  model: string;
  label: string;
  /** 是否支援圖生影片 */
  supportsImage: boolean;
  /** 是否原生支援音訊 */
  supportsAudio: boolean;
  creditCost: number;
}
