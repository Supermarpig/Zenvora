import type { Frame } from "./schemas";

/**
 * ⚠️ **目前無人 import**(比照技術債 D7 對 `actions/frame.ts` 的處理:保留當設計備忘)。
 *
 * 而且名字有誤導:它跟 `video/seedance-provider.ts` 沒有關係,那個 provider 打的是
 * 即夢 VGFM 且自己組 prompt。同一個誤導也在 `seedance-options.ts`(其實是
 * 鏡頭/風格/氛圍的標籤表,與任何 provider 無關)—— 那個檔案被廣泛 import,
 * 改名要動很多地方,暫不處理。
 */

export function buildSeedancePrompt(frame: Frame): string {
  const parts: string[] = [];

  parts.push(frame.prompt);

  if (frame.speaker && frame.dialogue) {
    parts.push(`${frame.speaker} says: "${frame.dialogue}"`);
  } else if (frame.dialogue) {
    parts.push(`Speaking: "${frame.dialogue}"`);
  }

  parts.push(`${frame.style} style`);
  parts.push(`${frame.mood} atmosphere`);
  parts.push(frame.cameraMovement.toLowerCase());
  parts.push(`${frame.duration}s`);

  return parts.join(", ") + ".";
}
