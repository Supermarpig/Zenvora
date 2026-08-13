import type { CharacterAssetType } from "./schemas";
import { renderTemplate, TEMPLATE_META } from "./prompt-template";

interface SheetInput {
  appearance: string;
  type?: CharacterAssetType;
}

/** 兩種 sheet 的模板覆寫;未傳則各自用內建 */
export interface SheetTemplates {
  characterSheet?: string;
  presenterSheet?: string;
}

/**
 * 角色設定圖(turnaround)prompt。
 * actor / reface → 三視圖全身轉身表;presenter → 親切上半身正面像。
 */
export function buildCharacterSheetPrompt(
  input: SheetInput,
  templates: SheetTemplates = {}
): string {
  const appearance = input.appearance.trim();

  const isPresenter = input.type === "presenter";
  const override = isPresenter
    ? templates.presenterSheet
    : templates.characterSheet;
  const builtIn = isPresenter
    ? TEMPLATE_META["presenter-sheet"].builtIn
    : TEMPLATE_META["character-sheet"].builtIn;

  return renderTemplate(override?.trim() || builtIn, { appearance });
}
