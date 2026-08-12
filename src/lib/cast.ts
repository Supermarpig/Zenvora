import { loadAssetImage } from "./db";
import type { CharacterAsset } from "./schemas";

export interface ResolvedCast {
  /** 要接在場景描述前面的角色一致性指示 */
  promptPrefix: string;
  /** 對齊「Reference image N」的參考圖 data URL 陣列 */
  referenceImages: string[];
}

/**
 * 把選角的人物資產解析成生圖/生影片可用的參考圖 + 提示前綴。
 * 有參考圖的資產會被編號並附圖;沒有圖的僅帶外觀文字。
 */
export async function resolveCast(
  assets: CharacterAsset[]
): Promise<ResolvedCast> {
  const withRefs: { asset: CharacterAsset; img: string }[] = [];
  const textOnly: CharacterAsset[] = [];

  for (const asset of assets) {
    const key = asset.referenceImageKeys[0];
    const img = key ? await loadAssetImage(key) : undefined;
    if (img) withRefs.push({ asset, img });
    else textOnly.push(asset);
  }

  const lines: string[] = [];
  withRefs.forEach((w, i) => {
    lines.push(`Reference image ${i + 1} is "${w.asset.name}": ${w.asset.appearance}.`);
  });
  textOnly.forEach((a) => {
    lines.push(`"${a.name}": ${a.appearance}.`);
  });

  const promptPrefix = lines.length
    ? `Keep these characters visually consistent — identical face, hairstyle, body proportions, and outfit. ${lines.join(
        " "
      )}`
    : "";

  return { promptPrefix, referenceImages: withRefs.map((w) => w.img) };
}
