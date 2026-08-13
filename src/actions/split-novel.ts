"use server";

import { z } from "zod";

/**
 * 小說 / 長文 → 場次大綱 + 角色清單。
 *
 * **刻意只做第一階段。** 拆分結果不可控,直接一路拆到分鏡的話,使用者要嘛
 * 全接受、要嘛全丟掉。先只拆「場」讓人確認、刪掉不要的,再逐場丟給
 * generate-storyboard 拆鏡 —— 那個 action 已經很成熟,不需要另寫一套。
 *
 * 順便產出角色清單,可直接建成資產:有了資產,拆鏡時才能用 @ 引用。
 */

const MAX_CHARS = 50_000;

const inputSchema = z.object({
  text: z.string().min(50, "文字太短,至少要 50 個字"),
  language: z.string().default("繁體中文"),
  /** 期望拆出的場數;留空讓模型自己判斷 */
  targetScenes: z.number().int().min(2).max(40).optional(),
});

export type SplitNovelInput = z.input<typeof inputSchema>;

export interface NovelScene {
  index: number;
  title: string;
  synopsis: string;
  suggestedShots: number;
}

export interface NovelCharacter {
  name: string;
  appearance: string;
}

export type SplitNovelResult =
  | { success: true; scenes: NovelScene[]; characters: NovelCharacter[] }
  | { success: false; error: string };

const responseSchema = {
  type: "object",
  properties: {
    scenes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          synopsis: { type: "string" },
          suggestedShots: { type: "integer" },
        },
        required: ["title", "synopsis", "suggestedShots"],
      },
    },
    characters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          appearance: { type: "string" },
        },
        required: ["name", "appearance"],
      },
    },
  },
  required: ["scenes", "characters"],
};

export async function splitNovel(
  input: SplitNovelInput
): Promise<SplitNovelResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { text, language, targetScenes } = parsed.data;
  if (text.length > MAX_CHARS) {
    return {
      success: false,
      error: `文字長度 ${text.length} 字超過上限 ${MAX_CHARS} 字,請分次貼入`,
    };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return { success: false, error: "請先設定 GOOGLE_AI_API_KEY 環境變數" };
  }

  const sys = [
    `You are a script editor adapting prose into a shootable structure.`,
    `Split the text below into scenes. A scene = one place + one continuous stretch of time + one narrative beat.`,
    targetScenes
      ? `Aim for about ${targetScenes} scenes.`
      : `Use as many scenes as the material actually needs — do not pad.`,
    ``,
    `For each scene give:`,
    `- title: a short scene heading`,
    `- synopsis: what happens, concrete enough that a storyboard artist could work from it`,
    `- suggestedShots: how many shots this scene needs (2–12)`,
    ``,
    `Also list the recurring characters that appear, with a physical appearance description usable for image generation.`,
    `Only list characters who actually appear more than once or matter to the plot — not every passer-by.`,
    `The appearance description must be in ENGLISH (it will be fed to an image model).`,
    `Everything else must be in ${language}.`,
    ``,
    `Text:`,
    text,
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
          temperature: 0.4,
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

    const data = JSON.parse(raw) as {
      scenes?: unknown[];
      characters?: unknown[];
    };

    const scenes: NovelScene[] = (data.scenes ?? [])
      .map((item, i) => {
        const s = (item ?? {}) as Record<string, unknown>;
        const shots = Number(s.suggestedShots);
        return {
          index: i + 1,
          title: String(s.title ?? "").trim() || `場 ${i + 1}`,
          synopsis: String(s.synopsis ?? "").trim(),
          // 夾在 2–12:模型偶爾會回 0 或誇張的數字
          suggestedShots: Number.isFinite(shots)
            ? Math.min(12, Math.max(2, Math.round(shots)))
            : 4,
        };
      })
      .filter((s) => s.synopsis.length > 0);

    if (scenes.length === 0) {
      return { success: false, error: "沒有拆出任何場次,請確認文字內容" };
    }

    const seen = new Set<string>();
    const characters: NovelCharacter[] = (data.characters ?? [])
      .map((item) => {
        const c = (item ?? {}) as Record<string, unknown>;
        return {
          name: String(c.name ?? "").trim(),
          appearance: String(c.appearance ?? "").trim(),
        };
      })
      .filter((c) => {
        if (!c.name || !c.appearance || seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      });

    return { success: true, scenes, characters };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "未知錯誤",
    };
  }
}
