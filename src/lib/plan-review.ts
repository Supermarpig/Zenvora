import { findMissingMentions } from "./mention";
import type { CharacterAsset, Frame } from "./schemas";

/**
 * 生成前的計畫預審(純程式規則部分)。
 *
 * 為什麼值得做:生圖免費層 `limit: 0`、影片沒有免費層 —— 每次生成都是真金
 * 白銀。在花錢之前先掃一遍,比事後發現「第 7 鏡的場景描述是空的」便宜太多。
 *
 * 這裡只放**確定性規則**:快、免費、不會誤報。語意層面的判斷(連戲、跳軸、
 * prompt 品質)交給 AI。
 *
 * 單價由呼叫方查表傳入(而非在此 import credits / video)—— 這樣本模組不依賴
 * 任何瀏覽器或 provider 程式碼,可以在 Node 下做單元測試。
 */

export interface Pricing {
  /** 每張圖的 credit */
  imageUnitCredits: number;
  /** 每秒影片的 credit */
  videoUnitCreditsPerSec: number;
}

export type IssueSeverity = "blocker" | "warning" | "hint";

export type IssueCategory =
  | "missing-prompt"
  | "missing-asset"
  | "duplicate-prompt"
  | "prompt-language"
  | "prompt-conflict"
  | "pacing"
  | "cost";

export interface PlanIssue {
  /** 全片層級的問題沒有 frameId */
  frameId?: string;
  shot?: number;
  severity: IssueSeverity;
  category: IssueCategory;
  message: string;
  suggestion?: string;
}

export interface CostEstimate {
  imageCredits: number;
  videoCredits: number;
  totalCredits: number;
  framesNeedingImage: number;
  framesNeedingVideo: number;
}

export interface PlanReview {
  issues: PlanIssue[];
  cost: CostEstimate;
  totalDurationSec: number;
  /** `@` 了但資產庫沒有的名稱,結構化回傳讓 UI 能直接提供「建立資產」動作 */
  missingAssets: string[];
}

/** 短影音的完看長度區間,超出只給 hint 不擋 */
const SHORT_FORM_MIN_SEC = 15;
const SHORT_FORM_MAX_SEC = 90;

/** 場景描述的資訊量低於這個值,生出來的圖通常很空 */
const THIN_PROMPT_LENGTH = 20;

/** `@角色` 引用的寬鬆比對(邊界取到空白或常見標點) */
const MENTION_PATTERN = /@[^\s,,。、)）」】]+/g;

/**
 * 檢查中文時先剝掉 `@角色` 引用 —— 角色名本來就常是中文,
 * 不該因此建議使用者「改用英文描述」。那種誤報會讓人不再看這份清單。
 */
function hasCJKOutsideMentions(text: string): boolean {
  return /[一-鿿]/.test(text.replace(MENTION_PATTERN, ""));
}

/**
 * 中文的資訊密度遠高於英文,同樣「字數」不能用同一個閾值 ——
 * 14 個中文字的描述其實很完整,不該被判定為過短。
 */
function informationLength(text: string): number {
  const cjkCount = (text.match(/[一-鿿]/g) ?? []).length;
  return text.length - cjkCount + cjkCount * 2.5;
}

/**
 * 成本用 credit 表算,不讓 AI 猜 —— 單價是已知的,程式算才準確。
 */
export function estimateCost(frames: Frame[], pricing: Pricing): CostEstimate {
  const needImage = frames.filter((f) => !f.hasImage && f.prompt?.trim());
  const needVideo = frames.filter((f) => !f.videoKey && f.prompt?.trim());

  // 影片單價是「每秒」指標,要乘以秒數
  const videoCredits = needVideo.reduce(
    (sum, f) =>
      sum + pricing.videoUnitCreditsPerSec * (f.videoDurationSec ?? f.duration),
    0
  );

  const imageCredits = needImage.length * pricing.imageUnitCredits;
  return {
    imageCredits,
    videoCredits,
    totalCredits: imageCredits + videoCredits,
    framesNeedingImage: needImage.length,
    framesNeedingVideo: needVideo.length,
  };
}

export function reviewPlan(
  frames: Frame[],
  assets: CharacterAsset[],
  pricing: Pricing
): PlanReview {
  const issues: PlanIssue[] = [];
  const sorted = [...frames].sort((a, b) => a.order - b.order);

  const totalDurationSec = sorted.reduce(
    (sum, f) => sum + (f.videoDurationSec ?? f.duration),
    0
  );

  // --- 逐鏡檢查 ---
  const promptCounts = new Map<string, number>();
  sorted.forEach((f) => {
    const key = f.prompt?.trim();
    if (key) promptCounts.set(key, (promptCounts.get(key) ?? 0) + 1);
  });
  const reportedDuplicates = new Set<string>();

  sorted.forEach((f, index) => {
    const shot = index + 1;
    const prompt = f.prompt?.trim() ?? "";

    if (!prompt) {
      issues.push({
        frameId: f.id,
        shot,
        severity: "blocker",
        category: "missing-prompt",
        message: `第 ${shot} 鏡沒有場景描述`,
        suggestion: "填寫畫面描述,或刪掉這一鏡",
      });
      return;
    }

    if (informationLength(prompt) < THIN_PROMPT_LENGTH) {
      issues.push({
        frameId: f.id,
        shot,
        severity: "warning",
        category: "missing-prompt",
        message: `第 ${shot} 鏡的場景描述只有 ${prompt.length} 個字`,
        suggestion: "補上主體、環境、光線,否則生出來的畫面會很空",
      });
    }

    if (hasCJKOutsideMentions(prompt)) {
      issues.push({
        frameId: f.id,
        shot,
        severity: "hint",
        category: "prompt-language",
        message: `第 ${shot} 鏡的場景描述含中文`,
        suggestion: "生圖模型對英文描述較穩定,中文留在台詞欄位即可",
      });
    }

    // 畫面描述要求文字,會與 buildImagePrompt 的 no-text 指示衝突
    if (/\b(text|caption|subtitle|title card|words?)\b/i.test(prompt)) {
      issues.push({
        frameId: f.id,
        shot,
        severity: "warning",
        category: "prompt-conflict",
        message: `第 ${shot} 鏡的描述要求畫面出現文字`,
        suggestion:
          "組出的 prompt 末段有「不要出現任何文字」的指示,兩者衝突;文字建議在剪映後製疊加",
      });
    }

    const dupCount = promptCounts.get(prompt) ?? 0;
    if (dupCount > 1 && !reportedDuplicates.has(prompt)) {
      reportedDuplicates.add(prompt);
      issues.push({
        severity: "warning",
        category: "duplicate-prompt",
        message: `有 ${dupCount} 個分鏡的場景描述完全相同`,
        suggestion: "可能是複製後忘記修改,會生出幾乎一樣的畫面",
      });
    }
  });

  // --- 全片層級 ---
  const missing = findMissingMentions(
    sorted.map((f) => f.prompt ?? ""),
    assets
  );
  if (missing.length > 0) {
    issues.push({
      severity: "blocker",
      category: "missing-asset",
      message: `prompt 裡引用了不存在的角色:${missing.join("、")}`,
      suggestion: "去資產庫建立它們,否則 @ 引用不會帶入參考圖,只會被當普通文字",
    });
  }

  if (sorted.length === 0) {
    issues.push({
      severity: "blocker",
      category: "missing-prompt",
      message: "這個專案還沒有任何分鏡",
    });
  } else if (totalDurationSec < SHORT_FORM_MIN_SEC) {
    issues.push({
      severity: "hint",
      category: "pacing",
      message: `全片只有 ${totalDurationSec} 秒`,
      suggestion: `短影音通常 ${SHORT_FORM_MIN_SEC}–${SHORT_FORM_MAX_SEC} 秒`,
    });
  } else if (totalDurationSec > SHORT_FORM_MAX_SEC) {
    issues.push({
      severity: "hint",
      category: "pacing",
      message: `全片 ${totalDurationSec} 秒,超過多數短影音平台的完看長度`,
      suggestion: `考慮拆成多支,或壓到 ${SHORT_FORM_MAX_SEC} 秒內`,
    });
  }

  const withDialogue = sorted.filter((f) => f.dialogue?.trim()).length;
  if (sorted.length > 0 && withDialogue === 0) {
    issues.push({
      severity: "hint",
      category: "pacing",
      message: "全片沒有任何對白",
      suggestion: "純畫面敘事沒問題,但導出剪映時不會有字幕檔",
    });
  }

  const cost = estimateCost(sorted, pricing);
  if (cost.totalCredits > 0) {
    issues.push({
      severity: "hint",
      category: "cost",
      message: `預估花費 ${cost.totalCredits} credits(${cost.framesNeedingImage} 張圖 + ${cost.framesNeedingVideo} 支影片)`,
      suggestion:
        cost.framesNeedingImage >= 9
          ? "考慮用「連續九宮格」一次生圖換九格,成本降到約 1/9"
          : undefined,
    });
  }

  // blocker → warning → hint
  const rank: Record<IssueSeverity, number> = { blocker: 0, warning: 1, hint: 2 };
  issues.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return { issues, cost, totalDurationSec, missingAssets: missing };
}
