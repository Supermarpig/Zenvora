"use server";

import { z } from "zod";

/**
 * AI 粗剪建議。
 *
 * 三個刻意的設計限制:
 *
 * 1. **只建議 `cut` 與 `reorder`,不動時長。** 改 duration 會連動整條時間軸
 *    與 SRT 時間碼,而模型對「這一鏡該幾秒」的判斷遠不如創作者。
 * 2. **回傳 shot 編號而非 frameId。** 讓模型處理 UUID 只會增加它出錯的機會,
 *    映射回 id 由 client 做。
 * 3. **只回建議,不改任何資料。** 剪接是創作決策,靜默改動使用者的分鏡是
 *    不可接受的 —— 由使用者逐項決定接受或拒絕。
 */

const shotInputSchema = z.object({
  shot: z.number().int().min(1),
  prompt: z.string(),
  dialogue: z.string().default(""),
  speaker: z.string().default(""),
  durationSec: z.number(),
});

const inputSchema = z.object({
  shots: z.array(shotInputSchema).min(2, "至少要有 2 個分鏡才需要粗剪"),
  /** 目標總長(秒),留空則不以長度為目標 */
  targetDurationSec: z.number().optional(),
  language: z.string().default("繁體中文"),
});

export type RoughCutInput = z.input<typeof inputSchema>;

export type RoughCutAction = "cut" | "reorder";

export interface RoughCutSuggestion {
  shot: number;
  action: RoughCutAction;
  /** action === "reorder" 時,這一鏡應該移到第幾個位置(1-based) */
  toShot?: number;
  reason: string;
}

export type RoughCutResult =
  | { success: true; suggestions: RoughCutSuggestion[]; summary: string }
  | { success: false; error: string };

const responseSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          shot: { type: "integer" },
          action: { type: "string", enum: ["cut", "reorder"] },
          toShot: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["shot", "action", "reason"],
      },
    },
  },
  required: ["summary", "suggestions"],
};

export async function suggestRoughCut(
  input: RoughCutInput
): Promise<RoughCutResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return { success: false, error: "請先設定 GOOGLE_AI_API_KEY 環境變數" };
  }

  const { shots, targetDurationSec, language } = parsed.data;
  const totalSec = shots.reduce((sum, s) => sum + s.durationSec, 0);

  const sys = [
    `You are a film editor doing a rough cut pass on a short-form video storyboard.`,
    `Total length is currently ${totalSec} seconds across ${shots.length} shots.`,
    targetDurationSec
      ? `The target length is around ${targetDurationSec} seconds.`
      : `Short-form video usually works best between 15 and 90 seconds.`,
    ``,
    `Suggest edits using ONLY these two actions:`,
    `- "cut": this shot is redundant, repeats another shot's information, or breaks the flow. Removing it makes the piece tighter.`,
    `- "reorder": this shot would land better at a different position. Give "toShot" as the 1-based target position.`,
    ``,
    `Do NOT suggest changing shot durations — that is the creator's call.`,
    `Be conservative: only suggest an edit when there is a concrete reason. Returning an empty list is a perfectly good answer for a well-cut sequence.`,
    `Never suggest cutting so much that the story stops making sense.`,
    `Write "summary" and every "reason" in ${language}.`,
    ``,
    `Shots:`,
    ...shots.map(
      (s) =>
        `${s.shot}. [${s.durationSec}s] ${s.prompt}${
          s.dialogue ? ` | ${s.speaker || "旁白"}：${s.dialogue}` : ""
        }`
    ),
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: sys }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          // 剪接建議要穩定可重現,不需要創意發散
          temperature: 0.3,
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
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { success: false, error: "API 未回傳內容" };

    const data = JSON.parse(text) as {
      summary?: unknown;
      suggestions?: unknown[];
    };

    const validShots = new Set(shots.map((s) => s.shot));
    const suggestions: RoughCutSuggestion[] = (data.suggestions ?? [])
      .map((raw) => {
        const s = (raw ?? {}) as Record<string, unknown>;
        const shot = Number(s.shot);
        const action = s.action === "reorder" ? "reorder" : "cut";
        const toShot = Number(s.toShot);
        return {
          shot,
          action: action as RoughCutAction,
          toShot: Number.isFinite(toShot) ? toShot : undefined,
          reason: String(s.reason ?? "").trim(),
        };
      })
      // 模型可能回不存在的鏡號或無意義的 reorder,一律丟掉而不是照樣顯示
      .filter(
        (s) =>
          validShots.has(s.shot) &&
          s.reason.length > 0 &&
          (s.action === "cut" ||
            (s.toShot !== undefined &&
              validShots.has(s.toShot) &&
              s.toShot !== s.shot))
      );

    return {
      success: true,
      suggestions,
      summary: String(data.summary ?? "").trim(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知錯誤",
    };
  }
}
