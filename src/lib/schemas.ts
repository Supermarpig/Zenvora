import { z } from "zod";

export const characterSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "角色名稱不可為空"),
  description: z.string().min(1, "請描述角色外觀"),
});

export type Character = z.infer<typeof characterSchema>;

// --- 人物資產(全域、跨專案可重用)---

export const CHARACTER_ASSET_TYPES = ["actor", "presenter", "reface"] as const;

export const CHARACTER_ASSET_TYPE_LABELS: Record<string, string> = {
  actor: "漫劇角色",
  presenter: "數字人主播",
  reface: "換臉目標",
};

/**
 * 資產種類。與 `type`(actor / presenter / reface)是**兩個不同維度** ——
 * `type` 是角色的子類,只在 kind === "character" 時有意義。把 scene / prop
 * 硬塞進 `type` 會讓「數字人主播的場景」這種組合無法表達。
 */
export const ASSET_KINDS = ["character", "scene", "prop", "costume"] as const;

export type AssetKind = (typeof ASSET_KINDS)[number];

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  character: "人物",
  scene: "場景",
  prop: "道具",
  costume: "服裝",
};

export const characterAssetSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "名稱不可為空"),
  /** 舊資料沒有這個欄位,預設 character(見 store 的 migrate) */
  kind: z.enum(ASSET_KINDS).default("character"),
  type: z.enum(CHARACTER_ASSET_TYPES).default("actor"),
  /** 僅 kind === "costume" 時有意義:這套服裝屬於哪個人物資產 */
  ownerAssetId: z.string().optional(),
  appearance: z.string().min(1, "請描述外觀"),
  /** 多角度參考圖，存於 IndexedDB，key 形如 asset-{id}-{n} */
  referenceImageKeys: z.array(z.string()).default([]),
  voice: z
    .object({
      provider: z.string().optional(),
      voiceId: z.string().optional(),
      sampleKey: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CharacterAsset = z.infer<typeof characterAssetSchema>;
export type CharacterAssetType = (typeof CHARACTER_ASSET_TYPES)[number];

export const createCharacterAssetSchema = z.object({
  name: z.string().min(1, "名稱不可為空"),
  kind: z.enum(ASSET_KINDS).default("character"),
  type: z.enum(CHARACTER_ASSET_TYPES).default("actor"),
  ownerAssetId: z.string().optional(),
  appearance: z.string().min(1, "請描述外觀"),
});

export type CreateCharacterAssetInput = z.infer<
  typeof createCharacterAssetSchema
>;

export const PROJECT_TYPES = ["comic", "commerce", "reface"] as const;

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  comic: "AI 漫劇",
  commerce: "帶貨影片",
  reface: "影片換人物",
};

/**
 * 世界觀錨定。
 *
 * `regions → locations` 是兩層結構而非扁平備註 —— 地點可以綁到 scene 資產,
 * 讓「世界觀裡的地點」與「可 @ 引用的場景」對上:世界觀負責敘事層的組織,
 * 場景資產負責視覺一致性。沒有場景資產時 `sceneAssetId` 留空也能用。
 *
 * 地圖刻意只存一張參考圖(沿用 IndexedDB),不做互動式地圖編輯器 ——
 * 那是獨立的大工程,列為非目標。
 */
export const worldviewLocationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "地點名稱不可為空"),
  description: z.string().default(""),
  /** 對應 kind === "scene" 的資產 id;未建立則為空 */
  sceneAssetId: z.string().optional(),
});

export const worldviewRegionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "區域名稱不可為空"),
  description: z.string().default(""),
  locations: z.array(worldviewLocationSchema).default([]),
});

export const worldviewSchema = z.object({
  /** 時代、地域、世界規則 */
  setting: z.string().default(""),
  /** 全片視覺基調,會注入所有生成 prompt */
  visualBible: z.string().default(""),
  musicMood: z.string().default(""),
  regions: z.array(worldviewRegionSchema).default([]),
});

export type Worldview = z.infer<typeof worldviewSchema>;
export type WorldviewRegion = z.infer<typeof worldviewRegionSchema>;
export type WorldviewLocation = z.infer<typeof worldviewLocationSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "專案名稱不可為空"),
  description: z.string().optional().default(""),
  characters: z.array(characterSchema).optional().default([]),
  /** 專案型態，決定走哪條 pipeline */
  projectType: z.enum(PROJECT_TYPES).optional(),
  /** 選角:此專案引用的人物資產 id */
  characterAssetIds: z.array(z.string()).optional(),
  worldview: worldviewSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1, "專案名稱不可為空"),
  description: z.string().default(""),
  projectType: z.enum(PROJECT_TYPES).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const CAMERA_MOVEMENTS = [
  "Fixed",
  "Pan Left",
  "Pan Right",
  "Zoom In",
  "Zoom Out",
  "Tracking Shot",
  "Orbit",
  "Aerial/Drone",
  "Handheld",
  "Dolly Zoom",
  "Crane Shot",
  "Follow Shot",
] as const;

export const VISUAL_STYLES = [
  "Photorealistic",
  "Cinematic",
  "Anime",
  "Cyberpunk",
  "Watercolor",
  "Film Noir",
  "Illustration",
  "3D Render",
] as const;

export const MOOD_OPTIONS = [
  "Warm/Golden Hour",
  "Moody/Dramatic",
  "Bright/Cheerful",
  "Cold/Blue Tone",
  "Neon/Glow",
  "Soft/Dreamy",
  "Dark/Horror",
  "Vintage/Retro",
] as const;

export const frameSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  order: z.number().int().min(0),
  prompt: z.string().min(1, "場景描述不可為空"),
  dialogue: z.string().optional().default(""),
  speaker: z.string().optional().default(""),
  cameraMovement: z.enum(CAMERA_MOVEMENTS).default("Fixed"),
  duration: z.number().min(4).max(15).default(8),
  style: z.enum(VISUAL_STYLES).default("Cinematic"),
  mood: z.enum(MOOD_OPTIONS).default("Moody/Dramatic"),
  imageBase64Key: z.string().optional(),
  creditCost: z.number().optional(),
  // --- 選角 ---
  /** 本格出場的人物資產 id */
  castIds: z.array(z.string()).optional(),
  // --- 影片生成 ---
  // 這裡存的是「分鏡的最終結果」——使用者重開瀏覽器後看到的影片與狀態。
  // 進行中的任務追蹤(providerJobId、輪詢)在 use-job-store,那邊同樣是 persist,
  // 所以界線是「結果 vs 任務」而不是「持久 vs 暫時」。
  // 注意 videoStatus 與 VideoJob.status 在 running / succeeded / failed 三個值上
  // 重疊,更新時要同步兩邊,否則會出現「job 已成功但分鏡還顯示 running」。
  /** IndexedDB 影片 key(video-{frameId}) */
  videoKey: z.string().optional(),
  videoModel: z.string().optional(),
  videoStatus: z
    .enum(["none", "queued", "running", "succeeded", "failed"])
    .optional(),
  videoDurationSec: z.number().optional(),
  videoError: z.string().optional(),
});

export type Frame = z.infer<typeof frameSchema>;

export const createFrameSchema = frameSchema.pick({
  prompt: true,
  dialogue: true,
  speaker: true,
  cameraMovement: true,
  duration: true,
  style: true,
  mood: true,
});

export type CreateFrameInput = z.infer<typeof createFrameSchema>;

export const updateFrameSchema = createFrameSchema.partial();

export type UpdateFrameInput = z.infer<typeof updateFrameSchema>;

// --- 備份快照 ---

/**
 * 備份/還原的快照格式。三種粒度共用同一個 schema,以 `scope` 區分 ——
 * 否則會做成三套互不相容的匯出。
 *
 * 素材不塞進 JSON(base64 會膨脹 33%),而是以二進位放在同一個 zip 內,
 * 用 mediaManifest 對應。`kind` 記錄原本存的是 data URL 還是 Blob,
 * 否則還原時無從得知該重建成哪一種 —— 圖片存字串、影片存 Blob。
 */
export const mediaManifestEntrySchema = z.object({
  /** IndexedDB 的 key,例如 image-{frameId} / video-{frameId} / asset-{id}-{n} */
  key: z.string(),
  /** zip 內的相對路徑 */
  file: z.string(),
  kind: z.enum(["dataUrl", "blob"]),
  /** kind 為 dataUrl 時用來重組 data URL;blob 時用來還原 Blob 的 type */
  mime: z.string().default("application/octet-stream"),
});

export const snapshotSchema = z.object({
  version: z.literal(1),
  scope: z.enum(["project", "all"]),
  exportedAt: z.string(),
  projects: z.array(projectSchema).default([]),
  frames: z.array(frameSchema).default([]),
  assets: z.array(characterAssetSchema).default([]),
  mediaManifest: z.array(mediaManifestEntrySchema).default([]),
});

export type Snapshot = z.infer<typeof snapshotSchema>;
export type MediaManifestEntry = z.infer<typeof mediaManifestEntrySchema>;

// --- 模型設定 ---

/**
 * 使用者可覆寫的模型選擇。
 *
 * **金鑰刻意不在這裡。** 這個 store 走 localStorage,任何同源腳本都讀得到;
 * 把 API key 放進來等於放棄 server action 的保護。金鑰一律留在伺服器端
 * 環境變數,這裡只存 model id 與標籤。
 *
 * 未設定的欄位沿用 code 裡的內建預設,所以不需要初始化資料,
 * 內建預設也能隨版本更新而生效。
 */
export const customModelSchema = z.object({
  id: z.string().min(1, "model id 不可為空"),
  label: z.string().min(1, "顯示名稱不可為空"),
  creditCost: z.number().min(0).default(2),
});

export type CustomModel = z.infer<typeof customModelSchema>;

export const modelConfigSchema = z.object({
  /** 生圖預設模型;空字串 = 用內建預設 */
  imageModel: z.string().default(""),
  /** 文字模型(生成分鏡、粗剪、拆小說、預審);空字串 = 用內建預設 */
  textModel: z.string().default(""),
  /** 生影片預設模型;空字串 = 用內建預設 */
  videoModel: z.string().default(""),
  /** 內建清單沒有的模型,讓使用者不必等改 code 就能試新模型 */
  customImageModels: z.array(customModelSchema).default([]),
});

export type ModelConfig = z.infer<typeof modelConfigSchema>;

// --- 未來擴充：使用者 & 鑽石金流 ---

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  diamondBalance: z.number().default(0),
  createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const creditTransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(["topup", "consume"]),
  amount: z.number(),
  description: z.string(),
  createdAt: z.string(),
});

export type CreditTransaction = z.infer<typeof creditTransactionSchema>;
