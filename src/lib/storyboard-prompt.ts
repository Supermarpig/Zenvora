import type { Frame, Character } from "./schemas";

type GridSize = 9 | 25;

const MOOD_STYLE: Record<string, string> = {
  "Warm/Golden Hour":
    "warm golden hour lighting with soft amber rim light and volumetric rays",
  "Moody/Dramatic":
    "dramatic high-contrast lighting with deep shadows and teal-orange color grading",
  "Bright/Cheerful":
    "bright cheerful lighting with vibrant saturated colors and soft fill light",
  "Cold/Blue Tone":
    "cool blue-toned lighting with desaturated clinical palette",
  "Neon/Glow":
    "vivid neon glow with magenta and cyan accents, cyberpunk night aesthetic",
  "Soft/Dreamy":
    "soft diffused dreamy lighting with pastel tones and heavy bokeh",
  "Dark/Horror":
    "dark horror atmosphere with harsh underlight and desaturated cold palette",
  "Vintage/Retro":
    "vintage warm faded tones with 35mm film grain and nostalgic soft-focus",
};

const LENS_STYLE: Record<string, string> = {
  Photorealistic: "photorealistic, shot on cinema camera with natural lighting",
  Cinematic:
    "cinematic film quality, shot on 35mm anamorphic lens with shallow depth of field and oval bokeh",
  Anime: "anime-style cel-shaded illustration",
  Cyberpunk: "cyberpunk Blade Runner aesthetic with neon reflections",
  Watercolor: "watercolor painting style with soft translucent washes",
  "Film Noir":
    "film noir black-and-white with high contrast and venetian blind shadows",
  Illustration: "polished digital illustration with clean stylized lines",
  "3D Render":
    "photorealistic 3D render with ray-traced lighting, Unreal Engine 5 quality",
};

function buildCharacterBlock(characters: Character[]): string[] {
  if (characters.length === 0) {
    return [
      `The characters must match the appearance of the person(s) in the uploaded reference photo exactly — same face, hairstyle, body proportions, and clothing.`,
    ];
  }

  const lines = [
    `Character Reference (match EXACTLY with uploaded reference photos, in order):`,
  ];
  characters.forEach((c, i) => {
    lines.push(`- Reference Photo ${i + 1} → "${c.name}": ${c.description}`);
  });
  lines.push(`Maintain identical character appearance across ALL images.`);
  return lines;
}

export function buildGridPrompt(
  frames: Frame[],
  gridSize: GridSize = 9,
  characters: Character[] = []
): string {
  const panelCount = gridSize;
  const selected = frames.slice(0, panelCount);
  const isSingleScene = selected.length === 1;
  const styleTag = selected[0].style;
  const moodTag = selected[0].mood;

  const lens = LENS_STYLE[styleTag] ?? styleTag;
  const mood = MOOD_STYLE[moodTag] ?? moodTag;

  if (isSingleScene) {
    const f = selected[0];
    const speaker = f.speaker ? `, ${f.speaker}` : "";

    return [
      `Using these characters, create a captivating ${panelCount}-part cinematic storyboard showing this scene from dramatically different filmmaking perspectives. Output format: a single composite image arranged as a strict 3×3 grid (3 rows, 3 columns), with ${panelCount} equal-sized panels and no borders, gaps, or labels between panels.`,
      ``,
      `Scene: ${f.prompt}${speaker}`,
      ``,
      `Visual direction:`,
      `- Style: ${lens}, ${mood}.`,
      `- Each panel MUST use a distinctly different combination of:`,
      `  • Shot size: vary between extreme wide, wide, medium, medium close-up, close-up, extreme close-up`,
      `  • Camera angle: vary between eye level, low angle, high angle, bird's eye, Dutch angle, over-the-shoulder, POV`,
      `  • Composition: use different techniques — rule of thirds, center frame, symmetry, leading lines, frame-within-frame, foreground depth layering`,
      `- Lighting should subtly shift between panels — vary rim light intensity, shadow direction, and highlight placement to create visual rhythm.`,
      `- The sequence should feel like hand-picked keyframes from a professional film — with narrative flow, emotional progression, and cinematic tension.`,
      ``,
      `Do not include any text, words, subtitles, numbers, or labels. Tell the story purely through visuals.`,
      ``,
      ...buildCharacterBlock(characters),
    ].join("\n");
  }

  const panelLines = selected.map((f, i) => {
    const speaker = f.speaker ? ` (${f.speaker})` : "";
    return `Part ${i + 1}: ${f.prompt}${speaker}`;
  });

  return [
    `Using these characters, create a captivating ${panelCount}-part cinematic storyboard. Output format: a single composite image arranged as a strict 3×3 grid (3 rows, 3 columns), with ${panelCount} equal-sized panels and no borders, gaps, or labels between panels.`,
    ``,
    `Visual direction:`,
    `- Style: ${lens}, ${mood}.`,
    `- Vary shot sizes (wide → close-up), camera angles (low/high/Dutch), and compositions (symmetry, leading lines, depth layering) across panels.`,
    `- The story should feel like keyframes from a professional film — with emotional highs and lows, dramatic lighting shifts, and visual continuity.`,
    ``,
    ...panelLines,
    ``,
    `Do not include any text, words, subtitles, numbers, or labels. Tell the story purely through visuals.`,
    ``,
    ...buildCharacterBlock(characters),
  ].join("\n");
}

export function buildFrameGridPrompt(
  frame: Frame,
  characters: Character[] = []
): string {
  return buildGridPrompt([frame], 9, characters);
}
