export const DIAMOND_TO_CREDIT_RATIO = 1;

export const MODEL_CREDIT_COST: Record<string, number> = {
  "gemini-3-pro-image-preview-4k": 20,
  "gemini-3-pro-image-preview-2k": 10,
  "gemini-3-pro-image-preview": 10,
  "gemini-2.5-flash-image-hd": 5,
  "gemini-2.5-flash-image": 2,
};

export function diamondsToCredits(diamonds: number): number {
  return diamonds * DIAMOND_TO_CREDIT_RATIO;
}

export function creditsToDiamonds(credits: number): number {
  return Math.ceil(credits / DIAMOND_TO_CREDIT_RATIO);
}
