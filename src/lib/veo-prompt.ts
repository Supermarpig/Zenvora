import type { Frame } from "./schemas";

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

const MOOD_LIGHTING: Record<string, string> = {
  "Warm/Golden Hour":
    "Warm golden hour lighting with soft amber rim light, gentle volumetric rays through windows, anamorphic lens flare",
  "Moody/Dramatic":
    "Dramatic high-contrast Rembrandt lighting, deep side shadows with teal-and-orange color grading, strong rim light separation",
  "Bright/Cheerful":
    "Bright even fill lighting with vibrant saturated colors, soft key light at 45 degrees, cheerful commercial energy",
  "Cold/Blue Tone":
    "Cool blue-toned overhead fluorescent lighting, desaturated clinical palette, isolated cold atmosphere",
  "Neon/Glow":
    "Vivid neon glow illumination with magenta and cyan accents reflecting off surfaces, cyberpunk night aesthetic",
  "Soft/Dreamy":
    "Soft diffused lighting through sheer curtain, warm pastel tones, heavy foreground bokeh creating dreamy depth",
  "Dark/Horror":
    "Harsh underlight casting distorted upward shadows, desaturated cold palette with single red accent, oppressive darkness",
  "Vintage/Retro":
    "Vintage warm faded tones with visible 35mm film grain, nostalgic soft-focus edges, tungsten practical light sources",
};

const STYLE_LENS: Record<string, string> = {
  Photorealistic:
    "Shot on ARRI Alexa cinema camera with Zeiss Master Prime lens, natural photorealistic rendering",
  Cinematic:
    "Shot on 35mm anamorphic lens with oval bokeh and horizontal flare, cinematic 2.39:1 widescreen aesthetic, shallow depth of field",
  Anime: "Anime-style cel-shaded illustration with vivid colors and clean lines",
  Cyberpunk:
    "Blade Runner neo-noir aesthetic, rain-soaked reflections, holographic UI overlays, shot on anamorphic lens",
  Watercolor:
    "Watercolor painting style with soft washes of translucent color, artistic brushstroke texture",
  "Film Noir":
    "Classic film noir black-and-white, high-contrast venetian blind shadow patterns, shot on vintage Cooke lens",
  Illustration:
    "Polished digital illustration, clean vector-like lines, stylized character proportions",
  "3D Render":
    "Photorealistic 3D render, physically-based materials, ray-traced global illumination, Unreal Engine 5 quality",
};

/**
 * 生圖 prompt（Gemini 單張圖片）：場景 + 鏡頭風格 + 光線氛圍
 */
export function buildImagePrompt(frame: Frame): string {
  const lens = STYLE_LENS[frame.style] ?? frame.style;
  const lighting = MOOD_LIGHTING[frame.mood] ?? frame.mood;

  return [
    frame.prompt,
    `${lens}. ${lighting}.`,
    `Do not include any text, words, subtitles, captions, labels, watermarks, or speech bubbles anywhere in the image. Pure visual only.`,
  ].join("\n\n");
}

/**
 * Veo 3 prompt（影片生成）：場景 + 風格 + 光線 + 攝影機運動 + 語音
 */
export function buildVeoPrompt(frame: Frame): string {
  const sections: string[] = [];

  sections.push(frame.prompt);

  const lens = STYLE_LENS[frame.style] ?? frame.style;
  const lighting = MOOD_LIGHTING[frame.mood] ?? frame.mood;
  sections.push(`${lens}. ${lighting}.`);

  const cam = CAMERA_DIRECTIONS[frame.cameraMovement];
  if (cam) {
    sections.push(cam + ".");
  }

  sections.push(
    `Do not render any text, subtitles, captions, labels, or watermarks in the video. Pure visual storytelling only.`
  );

  if (frame.speaker && frame.dialogue) {
    const cleaned = frame.dialogue.replace(/^[（(].*?[）)]$/g, "").trim();
    if (cleaned) {
      sections.push(
        `${frame.speaker} speaks in Taiwanese Mandarin: "${cleaned}"`
      );
    }
  } else if (frame.dialogue) {
    const isSfx = /^[（(]/.test(frame.dialogue);
    if (isSfx) {
      sections.push(`[SFX] ${frame.dialogue.replace(/[（()）]/g, "")}`);
    } else {
      sections.push(`A narrator speaks in Taiwanese Mandarin: "${frame.dialogue}"`);
    }
  }

  return sections.join("\n\n");
}
