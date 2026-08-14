import type { Frame } from "./schemas";

/** 遷移後一定會有的兩個欄位 */
type MigratedImageFields = {
  hasImage: boolean;
  imageVersion: number;
  imageBase64Key: undefined;
};

/**
 * 把舊的 `imageBase64Key` 換算成 `hasImage` + `imageVersion`(技術債 D3)。
 *
 * 舊欄位是一個字串,但它從來不是真的 key —— 實際讀取一律走 `loadImage(frame.id)`。
 * 它只承擔兩件事,而且硬塞在同一個字串裡:
 *
 * - `undefined` = 沒有圖;有值 = 有圖
 * - `image-{id}#{timestamp}` 後面那個 `#` 片段是版本號,九宮格切圖直接寫 IndexedDB
 *   之後靠它觸發畫面重讀
 *
 * 一個欄位兼兩個語意,所以誰看到都得先讀註解才知道它不是 key。
 *
 * **判斷規則:舊欄位有值就以它為準,否則保留現有的新欄位。**
 * 不能用「有沒有 `hasImage`」來判斷是否已遷移 —— 舊備份的 JSON 經過
 * `frameSchema.parse()` 之後,`hasImage` 已經被 zod 的 `.default(false)` 填上了,
 * 那時舊欄位還在。若以 `hasImage` 存在就跳過,圖會**靜默消失**(素材還在
 * IndexedDB,但畫面說沒有圖)。遷移完舊欄位會被清空,所以兩個欄位不會同時有值。
 *
 * **這個函式必須同時給 store 的 persist migrate 與備份還原用**,
 * 只改一邊的話,匯入舊備份就會走到沒遷移的那條路。
 */
export function migrateFrameImageFields<T extends Record<string, unknown>>(
  frame: T
): Omit<T, keyof MigratedImageFields> & MigratedImageFields {
  // Omit 先把三個會被覆寫的鍵拿掉,否則輸入帶 `imageBase64Key: string` 時
  // 交集會與 `undefined` 衝突而塌成 never
  const legacy = frame.imageBase64Key;

  if (typeof legacy === "string" && legacy) {
    const hash = legacy.indexOf("#");
    // `#` 後面不是正數時給 1 —— 只要不是 0 就能表達「動過」
    const parsed = hash >= 0 ? Number(legacy.slice(hash + 1)) : NaN;
    const imageVersion =
      Number.isFinite(parsed) && parsed > 0 ? parsed : hash >= 0 ? 1 : 0;

    return {
      ...frame,
      hasImage: true,
      imageVersion,
      imageBase64Key: undefined,
    };
  }

  // 沒有舊欄位:保留已經是新格式的值,沒有才給預設
  return {
    ...frame,
    hasImage: typeof frame.hasImage === "boolean" ? frame.hasImage : false,
    imageVersion:
      typeof frame.imageVersion === "number" ? frame.imageVersion : 0,
    imageBase64Key: undefined,
  };
}

/** 整批遷移,給 store migrate 與備份還原共用 */
export function migrateFrames(frames: unknown): Frame[] {
  if (!Array.isArray(frames)) return [];
  return frames.map((f) =>
    migrateFrameImageFields((f ?? {}) as Record<string, unknown>)
  ) as unknown as Frame[];
}
