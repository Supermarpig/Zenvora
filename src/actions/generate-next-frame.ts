"use server";

interface GenerateNextInput {
  currentPrompt: string;
  currentDialogue: string;
  currentSpeaker: string;
  projectDescription: string;
}

export type GenerateNextResult =
  | { success: true; prompt: string; dialogue: string; speaker: string }
  | { success: false; error: string };

export async function generateNextFrame(
  input: GenerateNextInput
): Promise<GenerateNextResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return { success: false, error: "請先設定 GOOGLE_AI_API_KEY" };
  }

  const systemPrompt = [
    `You are a cinematic storyboard assistant. Given the current frame's scene description and dialogue, generate the NEXT frame that continues the narrative.`,
    `Project context: ${input.projectDescription || "A cinematic video project."}`,
    ``,
    `Current frame:`,
    `- Scene: ${input.currentPrompt}`,
    `- Speaker: ${input.currentSpeaker || "N/A"}`,
    `- Dialogue: ${input.currentDialogue || "N/A"}`,
    ``,
    `Generate the next frame. Respond in EXACTLY this JSON format, nothing else:`,
    `{"prompt":"<English scene description for image generation, cinematic and detailed>","speaker":"<same speaker or new character, in original language>","dialogue":"<dialogue in the same language as the current dialogue>"}`,
  ].join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return {
        success: false,
        error: `API 錯誤 ${res.status}: ${errorBody.slice(0, 200)}`,
      };
    }

    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return { success: false, error: "API 未回傳內容" };
    }

    const parsed = JSON.parse(text);

    return {
      success: true,
      prompt: parsed.prompt || "",
      dialogue: parsed.dialogue || "",
      speaker: parsed.speaker || input.currentSpeaker || "",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "生成失敗",
    };
  }
}
