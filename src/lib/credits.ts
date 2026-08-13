export const DIAMOND_TO_CREDIT_RATIO = 1;

/**
 * 生圖模型的 credit 單價。**這裡是唯一來源** —— 先前 generate-image.ts 另存了
 * 一份相同的表,換模型 id 時得改兩個地方(已收斂,勿再複製)。
 */
export const MODEL_CREDIT_COST: Record<string, number> = {
  "gemini-2.5-flash-image": 2,
  "gemini-3-pro-image": 10,
};

export function diamondsToCredits(diamonds: number): number {
  return diamonds * DIAMOND_TO_CREDIT_RATIO;
}

export function creditsToDiamonds(credits: number): number {
  return Math.ceil(credits / DIAMOND_TO_CREDIT_RATIO);
}
