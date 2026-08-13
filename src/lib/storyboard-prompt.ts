import type { Frame, Character } from "./schemas";
import { STYLE_LENS, MOOD_LIGHTING } from "./style-tables";

type GridSize = 9 | 25;

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

  const lens = STYLE_LENS[styleTag]?.compact ?? styleTag;
  const mood = MOOD_LIGHTING[moodTag]?.compact ?? moodTag;

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
