"use server";

import { z } from "zod";
import { resolveTextModel } from "@/lib/model-config";

/**
 * 依 prompt 上下文推寫資產的外觀描述。
 *
 * 用途是「批量補齊缺失資產」:使用者在 prompt 裡 @ 了一個還沒建立的角色,
 * 與其要他從零想外觀,不如讓模型讀那幾鏡的描述推一份草稿 —— 使用者再改比
 * 從白紙開始快得多。
 *
 * 描述一律英文,因為它最終要餵給生圖模型。
 */

const inputSchema = z.object({
  /** 文字模型覆寫;留空用內建預設 */
  textModel: z.string().optional(),
  name: z.string().min(1, "請提供名稱"),
  /** 這個名稱出現過的分鏡描述,給模型判斷它是人、地點還是物件 */
  contexts: z.array(z.string()).min(1, "至少要有一段上下文"),
});

export type InferAssetInput = z.input<typeof inputSchema>;

export type InferredKind = "character" | "scene" | "prop" | "costume";

export type InferAssetResult =
  | { success: true; kind: InferredKind; appearance: string }
  | { success: false; error: string };

const responseSchema = {
  type: "object",
  properties: {
    kind: {
      type: "string",
      enum: ["character", "scene", "prop", "costume"],
    },
    appearance: { type: "string" },
  },
  required: ["kind", "appearance"],
};

export async function inferAsset(
  input: InferAssetInput
): Promise<InferAssetResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return { success: false, error: "請先設定 GOOGLE_AI_API_KEY 環境變數" };
  }

  const { name, contexts } = parsed.data;

  const sys = [
    `A storyboard references "${name}" but there is no asset for it yet.`,
    `Read the shot descriptions below and infer what "${name}" is, then write a reusable appearance description for an image model.`,
    ``,
    `- kind: "character" for a person, "scene" for a place, "prop" for an object, "costume" for clothing.`,
    `- appearance: ONE dense English sentence covering the traits that must stay identical across shots.`,
    `  For a character: age range, build, hair, face, signature clothing.`,
    `  For a scene: layout, architecture, materials, lighting character.`,
    `  For a prop or costume: shape, material, colour, wear and tear.`,
    `Only use what the shots actually support; where they are silent, choose something plain and consistent rather than inventing dramatic detail.`,
    `Do not mention camera work, mood, or the story — this describes the thing itself, not a shot of it.`,
    ``,
    `Shots mentioning "${name}":`,
    ...contexts.map((c, i) => `${i + 1}. ${c}`),
  ].join("\n");

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
          responseSchema,
          temperature: 0.5,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        error: `API 錯誤 ${res.status}: ${body.slice(0, 300)}`,
      };
    }

    const json = await res.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return { success: false, error: "API 未回傳內容" };

    const data = JSON.parse(raw) as { kind?: unknown; appearance?: unknown };
    const appearance = String(data.appearance ?? "").trim();
    if (!appearance) return { success: false, error: "模型沒有回傳外觀描述" };

    const kinds: InferredKind[] = ["character", "scene", "prop", "costume"];
    const kind = kinds.includes(data.kind as InferredKind)
      ? (data.kind as InferredKind)
      : "character";

    return { success: true, kind, appearance };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知錯誤",
    };
  }
}
