"use server";

import { z } from "zod";

/**
 * 計畫預審的語意層。
 *
 * 程式規則已經覆蓋了確定性的問題(空描述、缺資產、重複、成本),這裡只做
 * 程式判斷不了的:鏡與鏡之間的連戲、跳軸、prompt 是否真的能生出東西。
 *
 * 用文字模型(免費層有額度),所以這一層是可以真的跑的 —— 不像生圖那樣被
 * `limit: 0` 卡住。
 */

const shotSchema = z.object({
  shot: z.number().int().min(1),
  prompt: z.string(),
  dialogue: z.string().default(""),
  speaker: z.string().default(""),
  camera: z.string().default(""),
  durationSec: z.number(),
});

const inputSchema = z.object({
  shots: z.array(shotSchema).min(2, "至少要有 2 個分鏡才能檢查連戲"),
  language: z.string().default("繁體中文"),
});

export type ReviewPlanAiInput = z.input<typeof inputSchema>;

export type AiIssueCategory = "continuity" | "axis" | "prompt-quality" | "pacing";
export type AiIssueSeverity = "warning" | "hint";

export interface AiPlanIssue {
  /** 全片層級的問題沒有 shot */
  shot?: number;
  severity: AiIssueSeverity;
  category: AiIssueCategory;
  message: string;
  suggestion?: string;
}

export type ReviewPlanAiResult =
  | { success: true; issues: AiPlanIssue[] }
  | { success: false; error: string };

const responseSchema = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          shot: { type: "integer" },
          severity: { type: "string", enum: ["warning", "hint"] },
          category: {
            type: "string",
            enum: ["continuity", "axis", "prompt-quality", "pacing"],
          },
          message: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["severity", "category", "message"],
      },
    },
  },
  required: ["issues"],
};

export async function reviewPlanWithAi(
  input: ReviewPlanAiInput
): Promise<ReviewPlanAiResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return { success: false, error: "請先設定 GOOGLE_AI_API_KEY 環境變數" };
  }

  const { shots, language } = parsed.data;

  const sys = [
    `You are a film continuity supervisor reviewing a storyboard before anything gets rendered.`,
    ``,
    `Look ONLY for problems a human editor would catch by reading the sequence:`,
    `- "continuity": adjacent shots whose framing is so similar the cut will read as a jump cut / mistake, or a visual detail that contradicts an earlier shot.`,
    `- "axis": in a two-character or dialogue sequence, a shot that appears to cross the 180-degree line and would flip screen direction.`,
    `- "prompt-quality": a scene description that is self-contradictory, physically impossible, or too vague for an image model to render something specific.`,
    `- "pacing": a stretch that will feel flat — e.g. several long static shots in a row, or dialogue crammed into a shot far too short to speak it.`,
    ``,
    `Do NOT report: empty descriptions, duplicated text, missing assets, cost, or language choice — those are already checked by deterministic rules. Reporting them again is noise.`,
    `Be conservative. An empty issue list is a good answer for a well-constructed sequence. Only raise something you can point at concretely.`,
    `Severity is "warning" only if it would visibly hurt the finished video; otherwise "hint".`,
    `Write every message and suggestion in ${language}.`,
    ``,
    `Shots:`,
    ...shots.map(
      (s) =>
        `${s.shot}. [${s.durationSec}s, camera: ${s.camera || "unspecified"}] ${s.prompt}${
          s.dialogue ? ` | ${s.speaker || "旁白"}：${s.dialogue}` : ""
        }`
    ),
  ].join("\n");

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
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return { success: false, error: "API 未回傳內容" };

    const data = JSON.parse(raw) as { issues?: unknown[] };
    const validShots = new Set(shots.map((s) => s.shot));
    const categories = new Set<AiIssueCategory>([
      "continuity",
      "axis",
      "prompt-quality",
      "pacing",
    ]);

    const issues: AiPlanIssue[] = (data.issues ?? [])
      .map((item) => {
        const i = (item ?? {}) as Record<string, unknown>;
        const shot = Number(i.shot);
        const category = String(i.category) as AiIssueCategory;
        return {
          shot: Number.isFinite(shot) && validShots.has(shot) ? shot : undefined,
          severity: i.severity === "warning" ? ("warning" as const) : ("hint" as const),
          category: categories.has(category) ? category : ("continuity" as const),
          message: String(i.message ?? "").trim(),
          suggestion: String(i.suggestion ?? "").trim() || undefined,
        };
      })
      .filter((i) => i.message.length > 0);

    return { success: true, issues };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知錯誤",
    };
  }
}
