import type { Frame } from "./schemas";
import { STYLE_LENS, MOOD_LIGHTING } from "./style-tables";
import {
  renderTemplate,
  TEMPLATE_META,
  resolveFragment,
  type FragmentOverrides,
} from "./prompt-template";

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
export function buildFlowPrompt(
  frame: Frame,
  mute = true,
  fragments: FragmentOverrides = {}
): string {
  const sections: string[] = [];
  const f = (id: Parameters<typeof resolveFragment>[0]) =>
    resolveFragment(id, fragments);

  sections.push(f("flow-intro"));

  sections.push(frame.prompt);

  const cam = CAMERA_DIRECTIONS[frame.cameraMovement];
  if (cam) {
    sections.push(`Camera: ${cam}.`);
  }

  sections.push(f("flow-preserve"));

  if (mute) {
    sections.push(f("flow-ambient-only"));
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
  mute = true,
  fragments: FragmentOverrides = {}
): string {
  const sections: string[] = [];
  const f = (id: Parameters<typeof resolveFragment>[0]) =>
    resolveFragment(id, fragments);

  sections.push(f("extend-intro"));

  sections.push(nextFrame.prompt);

  const cam = CAMERA_DIRECTIONS[nextFrame.cameraMovement];
  if (cam) {
    sections.push(`Camera: ${cam}.`);
  }

  sections.push(f("extend-continuity"));

  if (mute) {
    sections.push(f("flow-ambient-only"));
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
  /** 固定句片段的使用者覆寫;不傳則全用內建 */
  fragments?: FragmentOverrides;
  /**
   * 這次生成有沒有起始參考圖。
   *
   * **預設 true 是為了不動既有呼叫方的輸出。** 純文生影片(t2v)沒有參考圖,
   * 若照樣叫模型「必須符合上傳參考圖的長相」,是在指向一張不存在的圖 ——
   * 那句約束要拿掉。
   */
  hasReferenceImage?: boolean;
}

/**
 * Veo 3 prompt（影片生成）：場景 + 風格 + 光線 + 攝影機運動 + 語音
 * mute = true 時省略台詞，只保留畫面 + 環境音效
 */
export function buildVeoPrompt(frame: Frame, opts: VeoOptions = {}): string {
  const sections: string[] = [];
  const f = (id: Parameters<typeof resolveFragment>[0]) =>
    resolveFragment(id, opts.fragments ?? {});

  sections.push(frame.prompt);

  const lens = STYLE_LENS[frame.style]?.verbose ?? frame.style;
  const lighting = MOOD_LIGHTING[frame.mood]?.verbose ?? frame.mood;
  sections.push(`${lens}. ${lighting}.`);

  const cam = CAMERA_DIRECTIONS[frame.cameraMovement];
  if (cam) {
    sections.push(cam + ".");
  }

  if (opts.hasReferenceImage ?? true) {
    sections.push(f("video-reference-match"));
  }

  sections.push(f("video-no-text"));

  if (opts.mute) {
    sections.push(f("video-ambient-only"));
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
