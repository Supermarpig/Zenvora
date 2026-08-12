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

export const characterAssetSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "角色名稱不可為空"),
  type: z.enum(CHARACTER_ASSET_TYPES).default("actor"),
  appearance: z.string().min(1, "請描述角色外觀"),
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
  name: z.string().min(1, "角色名稱不可為空"),
  type: z.enum(CHARACTER_ASSET_TYPES).default("actor"),
  appearance: z.string().min(1, "請描述角色外觀"),
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

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "專案名稱不可為空"),
  description: z.string().optional().default(""),
  characters: z.array(characterSchema).optional().default([]),
  /** 專案型態，決定走哪條 pipeline */
  projectType: z.enum(PROJECT_TYPES).optional(),
  /** 選角:此專案引用的人物資產 id */
  characterAssetIds: z.array(z.string()).optional(),
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
