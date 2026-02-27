import { z } from "zod";

export const projectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "專案名稱不可為空"),
  description: z.string().optional().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = projectSchema.pick({
  name: true,
  description: true,
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
