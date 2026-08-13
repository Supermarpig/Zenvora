"use server";

import { z } from "zod";
import { resolveTextModel } from "@/lib/model-config";
import {
  CAMERA_MOVEMENTS,
  VISUAL_STYLES,
  MOOD_OPTIONS,
  type CreateFrameInput,
} from "@/lib/schemas";

const inputSchema = z.object({
  /** 文字模型覆寫;留空用內建預設 */
  textModel: z.string().optional(),
  premise: z.string().min(1, "請輸入故事 / 主題"),
  frameCount: z.number().int().min(2).max(24).default(8),
  genre: z.string().optional(),
  style: z.enum(VISUAL_STYLES).optional(),
  language: z.string().default("繁體中文"),
  /** 專案角色名稱,讓台詞用得上 */
  characters: z.array(z.string()).optional(),
  /**
   * 資產庫裡可被 `@` 引用的名稱(人物與場景)。
   * 有值時會要求模型在 prompt 內用 `@名稱` 標記,一次補上「出場標記」與
   * 「指涉錨定」—— 否則產出的 prompt 只會有 "The daughter" 這種泛稱,
   * 生圖時模型無從得知該用哪張參考圖。
   */
  mentionableAssets: z.array(z.string()).optional(),
});

// 用 z.input:帶 default 的欄位(frameCount / language)在呼叫端可省略
export type GenerateStoryboardInput = z.input<typeof inputSchema>;

export type GeneratedShot = Pick<
  CreateFrameInput,
  | "prompt"
  | "dialogue"
  | "speaker"
  | "cameraMovement"
  | "duration"
  | "style"
  | "mood"
>;

export type GenerateStoryboardResult =
  | { success: true; shots: GeneratedShot[] }
  | { success: false; error: string };

// 讓模型只能從既有 enum 挑,回來就能直接對映 Frame
const shotResponseSchema = {
  type: "object",
  properties: {
    shots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          speaker: { type: "string" },
          dialogue: { type: "string" },
          cameraMovement: { type: "string", enum: [...CAMERA_MOVEMENTS] },
          style: { type: "string", enum: [...VISUAL_STYLES] },
          mood: { type: "string", enum: [...MOOD_OPTIONS] },
          duration: { type: "integer" },
        },
        required: ["prompt", "speaker", "dialogue", "cameraMovement", "style", "mood", "duration"],
      },
    },
  },
  required: ["shots"],
};

function clampEnum<T extends readonly string[]>(
  val: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  return typeof val === "string" && (allowed as readonly string[]).includes(val)
    ? (val as T[number])
    : fallback;
}

export async function generateStoryboard(
  input: GenerateStoryboardInput
): Promise<GenerateStoryboardResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const {
    premise,
    frameCount,
    genre,
    style,
    language,
    characters,
    mentionableAssets,
  } =
    parsed.data;

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return { success: false, error: "請先設定 GOOGLE_AI_API_KEY" };
  }

  const sys = [
    `You are a professional short-drama / comic storyboard director.`,
    `Break the following premise into EXACTLY ${frameCount} cinematic shots that tell a complete, engaging story with a clear beginning, escalation, and payoff.`,
    genre ? `Genre / tone: ${genre}.` : "",
    style ? `Overall visual style: ${style}.` : "",
    characters?.length
      ? `Use these existing characters where appropriate: ${characters.join(", ")}.`
      : "",
    mentionableAssets?.length
      ? [
          `The project has these reusable assets: ${mentionableAssets.join(", ")}.`,
          `IMPORTANT: inside the "prompt" field, refer to any of them with an @ prefix followed by the EXACT name, e.g. "@${mentionableAssets[0]} walks in".`,
          `Write @Name instead of a generic phrase like "the woman" or "the kitchen" whenever the asset applies — this is how the tool binds the shot to that asset's reference image.`,
          `Do NOT invent @names that are not in the list above. Characters or places outside the list must be described in plain words.`,
        ].join("\n")
      : "",
    ``,
    `For EACH shot output:`,
    `- prompt: a vivid ENGLISH scene description for image generation (who / where / action / composition). No text or subtitles in the image.`,
    `- speaker: the character speaking, in ${language} (or empty string if none).`,
    `- dialogue: the spoken line in ${language} (short, punchy; empty string if none). For narration or SFX, still put it here.`,
    `- cameraMovement, style, mood: choose the single best fitting value from the allowed enums.`,
    `- duration: an integer 4-10 seconds.`,
    ``,
    `Vary shot sizes, angles and pacing across shots so it feels like real film. Make dialogue natural and hook-driven.`,
    ``,
    `Premise: ${premise}`,
  ]
    .filter(Boolean)
    .join("\n");

  const model = resolveTextModel(parsed.data.textModel ?? "");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: sys }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: shotResponseSchema,
          temperature: 0.9,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        error: `API 錯誤 ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { success: false, error: "API 未回傳內容" };

    const data = JSON.parse(text) as { shots?: unknown[] };
    if (!Array.isArray(data.shots) || data.shots.length === 0) {
      return { success: false, error: "未生成任何分鏡" };
    }

    const shots: GeneratedShot[] = data.shots.map((raw) => {
      const s = (raw ?? {}) as Record<string, unknown>;
      const dur = Number(s.duration);
      return {
        prompt: String(s.prompt ?? "").trim() || "（待補場景描述）",
        speaker: String(s.speaker ?? "").trim(),
        dialogue: String(s.dialogue ?? "").trim(),
        cameraMovement: clampEnum(s.cameraMovement, CAMERA_MOVEMENTS, "Fixed"),
        style: clampEnum(s.style, VISUAL_STYLES, style ?? "Cinematic"),
        mood: clampEnum(s.mood, MOOD_OPTIONS, "Moody/Dramatic"),
        duration: Number.isFinite(dur) ? Math.min(15, Math.max(4, dur)) : 8,
      };
    });

    return { success: true, shots };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "生成失敗",
    };
  }
}
