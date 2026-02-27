"use server";

import { z } from "zod";

const generateImageInputSchema = z.object({
  prompt: z.string().min(1, "請輸入圖片描述"),
  model: z
    .enum([
      "gemini-3-pro-image-preview-4k",
      "gemini-3-pro-image-preview-2k",
      "gemini-3-pro-image-preview",
      "gemini-2.5-flash-image-hd",
      "gemini-2.5-flash-image",
    ])
    .default("gemini-2.5-flash-image"),
  imageSize: z
    .enum(["1:1", "3:2", "2:3", "3:4", "4:3", "9:16", "16:9"])
    .default("16:9"),
});

export type GenerateImageInput = z.infer<typeof generateImageInputSchema>;

export type GenerateImageResult = {
  success: true;
  base64: string;
  creditCost: number;
} | {
  success: false;
  error: string;
};

const MODEL_CREDIT_COST: Record<string, number> = {
  "gemini-3-pro-image-preview-4k": 20,
  "gemini-3-pro-image-preview-2k": 10,
  "gemini-3-pro-image-preview": 10,
  "gemini-2.5-flash-image-hd": 5,
  "gemini-2.5-flash-image": 2,
};

export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  const parsed = generateImageInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const apiKey = process.env.NANO_BANANA_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return { success: false, error: "請先設定 NANO_BANANA_API_KEY 環境變數" };
  }

  try {
    const res = await fetch("https://api.nanobananaapi.dev/v1/images/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: parsed.data.prompt,
        num: 1,
        model: parsed.data.model,
        image_size: parsed.data.imageSize,
      }),
    });

    if (!res.ok) {
      return { success: false, error: `API 錯誤: ${res.status} ${res.statusText}` };
    }

    const json = await res.json();
    if (json.code !== 0) {
      return { success: false, error: json.message || "生圖失敗" };
    }

    const imageUrl = Array.isArray(json.data.url)
      ? json.data.url[0]
      : json.data.url;

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return { success: false, error: "下載圖片失敗" };
    }

    const buffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = imageRes.headers.get("content-type") || "image/png";

    return {
      success: true,
      base64: `data:${contentType};base64,${base64}`,
      creditCost: MODEL_CREDIT_COST[parsed.data.model] ?? 2,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知錯誤",
    };
  }
}
