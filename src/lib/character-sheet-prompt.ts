import type { CharacterAssetType } from "./schemas";

interface SheetInput {
  appearance: string;
  type?: CharacterAssetType;
}

/**
 * 角色設定圖(turnaround)prompt。
 * actor / reface → 三視圖全身轉身表;presenter → 親切上半身正面像。
 */
export function buildCharacterSheetPrompt(input: SheetInput): string {
  const appearance = input.appearance.trim();

  if (input.type === "presenter") {
    return [
      `Professional upper-body portrait of a single friendly presenter, facing the camera with a warm confident expression.`,
      `Character: ${appearance}.`,
      `Clean neutral studio background, even soft key lighting, sharp focus on the face, natural skin tones.`,
      `Do not include any text, labels, watermarks, logos, or graphics. Pure clean portrait only.`,
    ].join("\n");
  }

  return [
    `Character reference sheet (turnaround) of ONE single consistent character.`,
    `Character: ${appearance}.`,
    `Show the SAME character in three views side by side on a clean neutral light-gray studio background: front view, 3/4 view, and side profile. Full body, standing in a relaxed neutral pose.`,
    `Keep the face, hairstyle, body proportions, and outfit IDENTICAL across all three views. Even soft studio lighting, no harsh shadows.`,
    `Do not include any text, labels, watermarks, measurement lines, grids, or color swatches. Pure clean character turnaround only.`,
  ].join("\n");
}
