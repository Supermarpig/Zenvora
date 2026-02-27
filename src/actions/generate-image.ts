"use server";

import { z } from "zod";

const generateImageInputSchema = z.object({
  prompt: z.string().min(1, "請輸入圖片描述"),
  model: z
    .enum([
      "gemini-2.5-flash-image",
      "gemini-3-pro-image-preview",
    ])
    .default("gemini-2.5-flash-image"),
  imageSize: z
    .enum(["1:1", "3:2", "2:3", "3:4", "4:3", "9:16", "16:9"])
    .default("16:9"),
});

export type GenerateImageInput = z.infer<typeof generateImageInputSchema>;

export type GenerateImageResult =
  | { success: true; base64: string; creditCost: number }
  | { success: false; error: string };

const MODEL_CREDIT_COST: Record<string, number> = {
  "gemini-2.5-flash-image": 2,
  "gemini-3-pro-image-preview": 10,
};

export async function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  const parsed = generateImageInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return { success: false, error: "請先設定 GOOGLE_AI_API_KEY 環境變數" };
  }

  const { prompt, model, imageSize } = parsed.data;
  const fullPrompt = `Generate an image in ${imageSize} aspect ratio: ${prompt}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return {
        success: false,
        error: `Google API 錯誤 ${res.status}: ${errorBody.slice(0, 200)}`,
      };
    }

    const json = await res.json();

    const candidates = json.candidates;
    if (!candidates?.length) {
      return { success: false, error: "API 未回傳任何結果" };
    }

    const parts = candidates[0].content?.parts;
    if (!parts?.length) {
      return { success: false, error: "API 回傳格式異常" };
    }

    const imagePart = parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    );

    if (!imagePart?.inlineData) {
      const textPart = parts.find((p: { text?: string }) => p.text);
      return {
        success: false,
        error: textPart?.text || "未能生成圖片",
      };
    }

    const { mimeType, data } = imagePart.inlineData;

    return {
      success: true,
      base64: `data:${mimeType};base64,${data}`,
      creditCost: MODEL_CREDIT_COST[model] ?? 2,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知錯誤",
    };
  }
}
