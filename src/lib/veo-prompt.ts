import type { Frame } from "./schemas";
import { STYLE_LENS, MOOD_LIGHTING } from "./style-tables";
import { renderTemplate, TEMPLATE_META } from "./prompt-template";

const SPEAKER_EN: Record<string, string> = {
  空服員: "The flight attendant",
  威力: "The man (Willie)",
  Sam: "Sam",
};

function speakerLine(speaker: string, dialogue: string): string {
  const name = SPEAKER_EN[speaker] ?? speaker;
  return `${name} speaks in Mandarin Chinese: "${dialogue}"`;
}

const CAMERA_DIRECTIONS: Record<string, string> = {
  Fixed: "Static locked-off camera on tripod, stable and composed",
  "Pan Left":
    "Smooth horizontal pan from right to left, gradually revealing the scene",
  "Pan Right":
    "Smooth horizontal pan from left to right, following the action",
  "Zoom In":
    "Slow deliberate zoom in, tightening focus on the subject, building tension",
  "Zoom Out":
    "Gradual zoom out, pulling back to reveal the wider environment",
  "Tracking Shot":
    "Steady tracking shot on dolly rails, following the subject with smooth lateral movement",
  Orbit:
    "Slow cinematic 360-degree orbit around the subject, revealing all angles",
  "Aerial/Drone":
    "Aerial drone shot gliding smoothly overhead, establishing the environment from above",
  Handheld:
    "Dynamic handheld camera with natural subtle shake, raw documentary energy",
  "Dolly Zoom":
    "Dolly zoom (Vertigo effect) — camera pushes forward while lens zooms out, warping spatial depth",
  "Crane Shot":
    "Crane shot rising upward in a sweeping arc, dramatically revealing the wider scene",
  "Follow Shot":
    "Steadicam follow shot trailing the subject from behind, immersive movement",
};

/**
 * 生圖 prompt（Gemini 單張圖片）：場景 + 鏡頭風格 + 光線氛圍
 */
export function buildImagePrompt(frame: Frame, template?: string): string {
  const lens = STYLE_LENS[frame.style]?.verbose ?? frame.style;
  const lighting = MOOD_LIGHTING[frame.mood]?.verbose ?? frame.mood;

  // template 未傳則用內建 —— 保持純函式,呼叫方負責從 store 取覆寫值
  return renderTemplate(template?.trim() || TEMPLATE_META.image.builtIn, {
    prompt: frame.prompt,
    lens,
    lighting,
  });
}

/**
 * Flow prompt（圖生影片）：只描述動作、運鏡、音效，不重複描述畫面外觀
 * 搭配九宮格中的單張圖片一起貼到 Google Flow
 */
export function buildFlowPrompt(frame: Frame, mute = true): string {
  const sections: string[] = [];

  sections.push(
    `Starting from this reference image, bring it to life with cinematic motion:`
  );

  sections.push(frame.prompt);

  const cam = CAMERA_DIRECTIONS[frame.cameraMovement];
  if (cam) {
    sections.push(`Camera: ${cam}.`);
  }

  sections.push(
    `Do not alter the character's face, clothing, or appearance from the reference image. Do not render any text, subtitles, or watermarks.`
  );

  if (mute) {
    sections.push(
      `[SFX] ambient environmental sound only. No dialogue, no narration.`
    );
  } else if (frame.speaker && frame.dialogue) {
    const cleaned = frame.dialogue.replace(/^[（(].*?[）)]$/g, "").trim();
    if (cleaned) {
      sections.push(speakerLine(frame.speaker, cleaned));
    }
  } else if (frame.dialogue) {
    const isSfx = /^[（(]/.test(frame.dialogue);
    if (isSfx) {
      sections.push(`[SFX] ${frame.dialogue.replace(/[（()）]/g, "")}`);
    }
  }

  return sections.join("\n\n");
}

/**
 * 延長 prompt（Flow 延長功能）：從當前鏡頭平滑過渡到下一鏡的動作
 */
export function buildExtendPrompt(
  currentFrame: Frame,
  nextFrame: Frame,
  mute = true
): string {
  const sections: string[] = [];

  sections.push(
    `Continuing seamlessly from the previous clip, smoothly transition into the next action:`
  );

  sections.push(nextFrame.prompt);

  const cam = CAMERA_DIRECTIONS[nextFrame.cameraMovement];
  if (cam) {
    sections.push(`Camera: ${cam}.`);
  }

  sections.push(
    `Maintain visual continuity — same characters, same location, same lighting. Do not alter faces, clothing, or appearance. No text, subtitles, or watermarks.`
  );

  if (mute) {
    sections.push(
      `[SFX] ambient environmental sound only. No dialogue, no narration.`
    );
  } else if (nextFrame.speaker && nextFrame.dialogue) {
    const cleaned = nextFrame.dialogue
      .replace(/^[（(].*?[）)]$/g, "")
      .trim();
    if (cleaned) {
      sections.push(speakerLine(nextFrame.speaker, cleaned));
    }
  }

  return sections.join("\n\n");
}

interface VeoOptions {
  mute?: boolean;
}

/**
 * Veo 3 prompt（影片生成）：場景 + 風格 + 光線 + 攝影機運動 + 語音
 * mute = true 時省略台詞，只保留畫面 + 環境音效
 */
export function buildVeoPrompt(frame: Frame, opts: VeoOptions = {}): string {
  const sections: string[] = [];

  sections.push(frame.prompt);

  const lens = STYLE_LENS[frame.style]?.verbose ?? frame.style;
  const lighting = MOOD_LIGHTING[frame.mood]?.verbose ?? frame.mood;
  sections.push(`${lens}. ${lighting}.`);

  const cam = CAMERA_DIRECTIONS[frame.cameraMovement];
  if (cam) {
    sections.push(cam + ".");
  }

  sections.push(
    `The characters must match the appearance of the person(s) in the uploaded reference photo exactly — same face, hairstyle, body proportions, and clothing.`
  );

  sections.push(
    `Do not render any text, subtitles, captions, labels, or watermarks in the video. Pure visual storytelling only.`
  );

  if (opts.mute) {
    sections.push(`[SFX] ambient room tone and subtle environmental sound only. No dialogue, no narration, no voice.`);
  } else {
    if (frame.speaker && frame.dialogue) {
      const cleaned = frame.dialogue.replace(/^[（(].*?[）)]$/g, "").trim();
      if (cleaned) {
        sections.push(speakerLine(frame.speaker, cleaned));
      }
    } else if (frame.dialogue) {
      const isSfx = /^[（(]/.test(frame.dialogue);
      if (isSfx) {
        sections.push(`[SFX] ${frame.dialogue.replace(/[（()）]/g, "")}`);
      } else {
        sections.push(`A narrator speaks in Mandarin Chinese: "${frame.dialogue}"`);
      }
    }
  }

  return sections.join("\n\n");
}
