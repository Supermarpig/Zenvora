import { loadAssetImage } from "./db";
import type { AssetKind, CharacterAsset } from "./schemas";
import { findMentionedAssets, replaceMentions } from "./mention";

// 這些純函式已搬到 mention.ts(為了可測試),從這裡 re-export 維持既有 import 路徑
export {
  findMentionedAssets,
  replaceMentions,
  findMissingMentions,
} from "./mention";

/**
 * 一致性指示句依資產種類分開寫。
 *
 * 對場景說「identical face, hairstyle」是純雜訊 —— 模型要被告知的是這個
 * 空間的佈局與光線該保持一致,而不是它的髮型。
 */
const CONSISTENCY_DIRECTIVE: Record<AssetKind, string> = {
  character:
    "Keep these characters visually consistent — identical face, hairstyle, body proportions, and outfit.",
  scene:
    "Keep these locations visually consistent — identical layout, architecture, furniture placement, and lighting setup.",
  prop:
    "Keep these props visually consistent — identical shape, material, colour, and scale.",
  costume:
    "Keep these outfits visually consistent — identical garment cut, fabric, colour, and how it drapes.",
};

/** 依 kind 分組出句;跨 kind 的參考圖編號仍是單一序列(參考圖陣列只有一條) */
function buildConsistencyLines(
  withRefs: { asset: CharacterAsset; index: number }[],
  textOnly: CharacterAsset[]
): string[] {
  const byKind = new Map<AssetKind, string[]>();

  const push = (kind: AssetKind, line: string) => {
    const existing = byKind.get(kind);
    if (existing) existing.push(line);
    else byKind.set(kind, [line]);
  };

  for (const { asset, index } of withRefs) {
    push(
      asset.kind ?? "character",
      `Reference image ${index} is "${asset.name}": ${asset.appearance}.`
    );
  }
  for (const asset of textOnly) {
    push(asset.kind ?? "character", `"${asset.name}": ${asset.appearance}.`);
  }

  return [...byKind.entries()].map(
    ([kind, lines]) => `${CONSISTENCY_DIRECTIVE[kind]} ${lines.join(" ")}`
  );
}

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

  const refIndexByAssetId: Record<string, number> = {};
  const indexed = withRefs.map((w, i) => {
    refIndexByAssetId[w.asset.id] = i + 1;
    return { asset: w.asset, index: i + 1 };
  });

  const promptPrefix = buildConsistencyLines(indexed, textOnly).join("\n");

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
