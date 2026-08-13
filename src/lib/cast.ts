import { loadAssetImage } from "./db";
import type { CharacterAsset } from "./schemas";
import { findMentionedAssets, replaceMentions } from "./mention";

// 這些純函式已搬到 mention.ts(為了可測試),從這裡 re-export 維持既有 import 路徑
export {
  findMentionedAssets,
  replaceMentions,
  findMissingMentions,
} from "./mention";

export interface ResolvedCast {
  /** 要接在場景描述前面的角色一致性指示 */
  promptPrefix: string;
  /** 對齊「Reference image N」的參考圖 data URL 陣列 */
  referenceImages: string[];
  /** assetId → 參考圖編號(1-based);沒有參考圖的角色不在此表 */
  refIndexByAssetId: Record<string, number>;
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
  const refIndexByAssetId: Record<string, number> = {};
  withRefs.forEach((w, i) => {
    refIndexByAssetId[w.asset.id] = i + 1;
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

  return {
    promptPrefix,
    referenceImages: withRefs.map((w) => w.img),
    refIndexByAssetId,
  };
}

export interface ComposedCastPrompt {
  /** 前綴 + 已展開 @引用 的完整 prompt */
  prompt: string;
  referenceImages: string[];
  /** 實際被帶入的角色(@引用 ∪ 手動選角),依參考圖編號順序 */
  usedAssetIds: string[];
}

/**
 * 生圖前組 prompt 的單一入口。
 * 角色來源是「prompt 裡 @ 到的」聯集「castIds 手動選的」,@引用 先排以決定參考圖編號。
 */
export async function composeCastPrompt(
  rawPrompt: string,
  allAssets: CharacterAsset[],
  castIds: string[]
): Promise<ComposedCastPrompt> {
  const ordered = findMentionedAssets(rawPrompt, allAssets);
  for (const asset of allAssets) {
    if (castIds.includes(asset.id) && !ordered.some((o) => o.id === asset.id)) {
      ordered.push(asset);
    }
  }

  const { promptPrefix, referenceImages, refIndexByAssetId } =
    await resolveCast(ordered);
  const body = replaceMentions(rawPrompt, ordered, refIndexByAssetId);

  return {
    prompt: promptPrefix ? `${promptPrefix}\n\n${body}` : body,
    referenceImages,
    usedAssetIds: ordered.map((a) => a.id),
  };
}
