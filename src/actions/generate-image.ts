"use server";

import { z } from "zod";
import { MODEL_CREDIT_COST } from "@/lib/credits";
import { DEFAULT_IMAGE_MODEL } from "@/lib/model-config";

const generateImageInputSchema = z.object({
  prompt: z.string().min(1, "請輸入圖片描述"),
  // 刻意不用 enum:使用者可以在設定裡加內建清單沒有的 model id,
  // 硬擋在 zod 這層等於每次 Google 出新模型都要改 code 重新部署。
  // 換來的代價是打錯 id 會由 Google 回 404,而非本地就攔下 —— 錯誤訊息
  // 會原樣顯示在 toast,足以判斷。
  model: z.string().min(1, "請指定模型").default(DEFAULT_IMAGE_MODEL),
  imageSize: z
    .enum(["1:1", "3:2", "2:3", "3:4", "4:3", "9:16", "16:9"])
    .default("16:9"),
  /** 參考圖(data URL),用於角色一致性生成 */
  referenceImages: z.array(z.string()).optional(),
});

/** 把 data URL 拆成 Gemini inlineData 需要的 mimeType + base64 */
function toInlineData(
  dataUrl: string
): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export type GenerateImageInput = z.infer<typeof generateImageInputSchema>;

export type GenerateImageResult =
  | { success: true; base64: string; creditCost: number }
  | { success: false; error: string };

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

  const { prompt, model, imageSize, referenceImages } = parsed.data;
  const fullPrompt = `Generate an image in ${imageSize} aspect ratio: ${prompt}`;

  // requestParts:先放參考圖(inlineData),再放文字指示
  const requestParts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];
  for (const dataUrl of referenceImages ?? []) {
    const inline = toInlineData(dataUrl);
    if (inline) requestParts.push({ inlineData: inline });
  }
  requestParts.push({ text: fullPrompt });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: requestParts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return {
        success: false,
        error: `Google API 錯誤 ${res.status}: ${errorBody.slice(0, 800)}`,
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
