import type { CharacterAsset } from "./schemas";

/**
 * `@角色` 引用的解析與展開。
 *
 * 刻意與 cast.ts 分開:cast.ts 需要讀 IndexedDB(參考圖),而這裡全是純函式。
 * 分開之後這些邏輯才能在 Node 下做單元測試,也讓 plan-review 之類的模組
 * 不必為了用 findMissingMentions 而拉進 idb-keyval。
 */

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

/**
 * 找出 prompt 裡 `@` 了、但資產庫沒有的名稱。
 *
 * 不能用 tokenizeMentions —— 它只認得既有資產,未知的 `@xxx` 會被當普通文字。
 * 這裡改用寬鬆規則掃出所有 `@` 後接的連續非空白字元,再減去已知資產名。
 *
 * 邊界取到空白或常見標點為止(`@小雨,` 應該辨識成「小雨」),
 * 並排除英文的 email 樣式(`a@b.com` 不是角色引用)。
 */
export function findMissingMentions(
  prompts: string[],
  assets: CharacterAsset[]
): string[] {
  const known = new Set(assets.map((a) => a.name));
  const missing = new Set<string>();

  for (const prompt of prompts) {
    // 前面不可緊接文字(排除 email);名稱到空白或標點為止
    for (const m of prompt.matchAll(/(^|[\s(（「【,,。、])@([^\s,,。、)）」】]+)/g)) {
      const name = m[2];
      if (!name || known.has(name)) continue;
      // 已知資產名的前綴也算命中(例:@小雨的 → 小雨),不視為缺失
      if ([...known].some((k) => name.startsWith(k))) continue;
      missing.add(name);
    }
  }

  return [...missing];
}
