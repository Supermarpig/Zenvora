const PUNCTUATION = /([。，！？；、…]+)/;

const VEO_MAX_DURATION = 8;
const CHARS_PER_SECOND = 4.5;
export const MAX_CHARS_PER_SEGMENT = VEO_MAX_DURATION * CHARS_PER_SECOND;

/**
 * 計算「可說字數」：英文/數字品牌名視為 1 個字，標點與空白不計。
 */
export function countSpeakingChars(text: string): number {
  return text
    .replace(/[A-Za-z0-9]+/g, "字")
    .replace(/[，。！？；、\s…—「」『』《》（）()：:]/g, "")
    .length;
}

export function splitDialogue(
  dialogue: string,
  maxChars: number = MAX_CHARS_PER_SEGMENT
): string[] {
  const trimmed = dialogue.trim();
  if (!trimmed || trimmed.length <= maxChars) return [trimmed];

  const tokens = trimmed.split(PUNCTUATION).filter(Boolean);

  const segments: string[] = [];
  let current = "";

  for (const token of tokens) {
    if (PUNCTUATION.test(token)) {
      current += token;
      continue;
    }

    if (current.length + token.length > maxChars && current.length > 0) {
      segments.push(current.trim());
      current = token;
    } else {
      current += token;
    }
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments.length > 0 ? segments : [trimmed];
}
