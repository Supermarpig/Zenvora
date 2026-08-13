import type { Frame, Character } from "./schemas";
import { STYLE_LENS, MOOD_LIGHTING } from "./style-tables";

export type GridSize = 4 | 6 | 9 | 25;
export type GridOrientation = "landscape" | "portrait";

export interface GridSpec {
  cols: number;
  rows: number;
  /** 整張合成圖建議的輸出比例(對應 imageSizeOptions) */
  imageAspect: "16:9" | "9:16";
  /** 每格的近似構圖框,寫進 prompt 讓模型知道要在什麼比例裡構圖 */
  panelAspect: string;
}

/**
 * 把寬高比對到最接近的常見比例。
 *
 * 刻意給明確數字而非「wider than tall」這種模糊描述 —— 模型要知道構圖框的
 * 實際形狀。用固定的常見比例表而非最簡分數搜尋,否則會算出 13:11 這種
 * 對模型沒有意義的比例。
 */
const COMMON_ASPECTS: readonly [number, number][] = [
  [16, 9], [9, 16], [4, 3], [3, 4], [3, 2], [2, 3], [1, 1], [6, 5], [5, 6],
];

function describeAspect(ratio: number): string {
  let best = COMMON_ASPECTS[0];
  let bestErr = Infinity;
  for (const [w, h] of COMMON_ASPECTS) {
    const err = Math.abs(ratio - w / h);
    if (err < bestErr) {
      bestErr = err;
      best = [w, h];
    }
  }
  return `${best[0]}:${best[1]}`;
}

/**
 * 格數與方向決定排版。
 *
 * 直版之所以必要:短影音是 9:16。若用橫版比例生直版短片的分鏡,每格構圖
 * 全部走掉,切出來無法直接用。
 */
export function gridSpec(
  size: GridSize,
  orientation: GridOrientation = "landscape"
): GridSpec {
  const portrait = orientation === "portrait";
  const layout =
    size === 4
      ? { cols: 2, rows: 2 }
      : size === 6
        ? portrait
          ? { cols: 2, rows: 3 }
          : { cols: 3, rows: 2 }
        : size === 9
          ? { cols: 3, rows: 3 }
          : { cols: 5, rows: 5 };

  const imageAspect = portrait ? "9:16" as const : "16:9" as const;
  const [imgW, imgH] = portrait ? [9, 16] : [16, 9];
  const panelRatio = imgW / layout.cols / (imgH / layout.rows);

  return { ...layout, imageAspect, panelAspect: describeAspect(panelRatio) };
}

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
  characters: Character[] = [],
  orientation: GridOrientation = "landscape"
): string {
  const panelCount = gridSize;
  const spec = gridSpec(gridSize, orientation);
  // 先前這裡寫死「strict 3×3 grid」,所以 25 格模式產生的 prompt 自相矛盾
  const layoutLine = `a single composite image arranged as a strict ${spec.cols}×${spec.rows} grid (${spec.rows} rows, ${spec.cols} columns) in ${spec.imageAspect} overall aspect ratio, with ${panelCount} equal-sized panels each composed for a ${spec.panelAspect} frame, and no borders, gaps, or labels between panels.`;
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
      `Using these characters, create a captivating ${panelCount}-part cinematic storyboard showing this scene from dramatically different filmmaking perspectives. Output format: ${layoutLine}`,
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
    `Using these characters, create a captivating ${panelCount}-part cinematic storyboard. Output format: ${layoutLine}`,
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
