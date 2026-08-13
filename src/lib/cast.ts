import { loadAssetImage } from "./db";
import type { CharacterAsset } from "./schemas";

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

// --- @角色 引用 ---

/**
 * 為什麼需要這層:光把角色定義列在 prompt 前面,句子裡仍只有「a younger woman」
 * 這種泛稱,多角色同框時模型得自己猜哪個泛稱對應哪張參考圖,容易換臉或混合特徵。
 * 在 prompt 裡寫 `@女兒`,展開後參考圖編號會長在名詞的位置上,指涉就被錨定住。
 */

type MentionToken =
  | { type: "text"; value: string }
  | { type: "mention"; asset: CharacterAsset };

/**
 * 把 prompt 切成純文字與 @角色 兩種 token。
 * 只認得既有資產的名稱(不猜邊界),長名優先比對,避免「母」先吃掉「母親」。
 */
function tokenizeMentions(
  prompt: string,
  assets: CharacterAsset[]
): MentionToken[] {
  const byLength = [...assets]
    .filter((a) => a.name)
    .sort((a, b) => b.name.length - a.name.length);

  const tokens: MentionToken[] = [];
  let buffer = "";
  let i = 0;

  while (i < prompt.length) {
    if (prompt[i] === "@") {
      const rest = prompt.slice(i + 1);
      const hit = byLength.find((a) => rest.startsWith(a.name));
      if (hit) {
        if (buffer) {
          tokens.push({ type: "text", value: buffer });
          buffer = "";
        }
        tokens.push({ type: "mention", asset: hit });
        i += 1 + hit.name.length;
        continue;
      }
    }
    buffer += prompt[i];
    i += 1;
  }

  if (buffer) tokens.push({ type: "text", value: buffer });
  return tokens;
}

/** prompt 裡 @ 到的角色,依首次出現順序;未知名稱會被忽略 */
export function findMentionedAssets(
  prompt: string,
  assets: CharacterAsset[]
): CharacterAsset[] {
  const seen = new Set<string>();
  const found: CharacterAsset[] = [];

  for (const token of tokenizeMentions(prompt, assets)) {
    if (token.type === "mention" && !seen.has(token.asset.id)) {
      seen.add(token.asset.id);
      found.push(token.asset);
    }
  }
  return found;
}

/** 把 `@女兒` 換成 `女兒 (reference image 1)`;沒有參考圖的角色只留名字 */
export function replaceMentions(
  prompt: string,
  assets: CharacterAsset[],
  refIndexByAssetId: Record<string, number>
): string {
  return tokenizeMentions(prompt, assets)
    .map((token) => {
      if (token.type === "text") return token.value;
      const index = refIndexByAssetId[token.asset.id];
      return index
        ? `${token.asset.name} (reference image ${index})`
        : token.asset.name;
    })
    .join("");
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
