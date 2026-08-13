import type { AssetKind, CharacterAssetType } from "./schemas";
import {
  renderTemplate,
  TEMPLATE_META,
  type PromptTemplateId,
} from "./prompt-template";

interface SheetInput {
  appearance: string;
  /** 資產種類決定要生哪種參考圖;舊資料沒有此欄位時視為人物 */
  kind?: AssetKind;
  type?: CharacterAssetType;
}

/** 各種 sheet 的模板覆寫;未傳則各自用內建 */
export interface SheetTemplates {
  characterSheet?: string;
  presenterSheet?: string;
  sceneSheet?: string;
  propSheet?: string;
}

/**
 * 資產參考圖 prompt。依種類走完全不同的句式:
 * - 人物(actor / reface)→ 三視圖全身轉身表
 * - 人物(presenter)→ 親切上半身正面像
 * - 場景 → 同一空間的多視角 establishing shots(**不是** turnaround,
 *   對一個房間說「轉一圈」沒有意義)
 * - 道具 / 服裝 → 白底多角度產品圖
 */
export function buildCharacterSheetPrompt(
  input: SheetInput,
  templates: SheetTemplates = {}
): string {
  const appearance = input.appearance.trim();

  const kind = input.kind ?? "character";

  const pick = (): { override?: string; builtInId: PromptTemplateId } => {
    if (kind === "scene")
      return { override: templates.sceneSheet, builtInId: "scene-sheet" };
    if (kind === "prop" || kind === "costume")
      return { override: templates.propSheet, builtInId: "prop-sheet" };
    if (input.type === "presenter")
      return {
        override: templates.presenterSheet,
        builtInId: "presenter-sheet",
      };
    return { override: templates.characterSheet, builtInId: "character-sheet" };
  };

  const { override, builtInId } = pick();
  return renderTemplate(
    override?.trim() || TEMPLATE_META[builtInId].builtIn,
    { appearance }
  );
}
