import type { Frame, Character } from "./schemas";

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
  lines.push(
    `Maintain identical character appearance across ALL images.`
  );
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

  if (isSingleScene) {
    const f = selected[0];
    const speaker = f.speaker ? `, ${f.speaker}` : "";
    return [
      `Using these characters, create a captivating ${panelCount}-part storyboard with ${panelCount} images showing this scene from different cinematic angles and distances.`,
      ``,
      `Scene: ${f.prompt}${speaker}`,
      `Style: ${styleTag}, ${moodTag} atmosphere.`,
      ``,
      `The sequence should feel like keyframes from a continuous shot — with varied framing including wide shots, close-ups, low angles, high angles, and over-the-shoulder views.`,
      `Do not include any text or words in the images. Tell the story purely through visuals.`,
      ``,
      ...buildCharacterBlock(characters),
    ].join("\n");
  }

  const panelLines = selected.map((f, i) => {
    const speaker = f.speaker ? ` (${f.speaker})` : "";
    return `Part ${i + 1}: ${f.prompt}${speaker}`;
  });

  return [
    `Using these characters, create a captivating ${panelCount}-part cinematic storyboard with ${panelCount} images.`,
    `Style: ${styleTag}, ${moodTag} atmosphere.`,
    ``,
    ...panelLines,
    ``,
    `The story should be thrilling with emotional highs and lows, varied camera angles, and visual continuity.`,
    `Do not include any text or words in the images. Tell the story purely through visuals.`,
    ``,
    ...buildCharacterBlock(characters),
  ].join("\n");
}

export function buildFrameGridPrompt(frame: Frame, characters: Character[] = []): string {
  return buildGridPrompt([frame], 9, characters);
}
