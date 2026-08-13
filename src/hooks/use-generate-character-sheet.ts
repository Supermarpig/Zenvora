"use client";

import { useMutation } from "@tanstack/react-query";
import { generateImage, type GenerateImageInput } from "@/actions/generate-image";
import { buildCharacterSheetPrompt } from "@/lib/character-sheet-prompt";
import { saveAssetImage } from "@/lib/db";
import { useCharacterAssetStore } from "@/stores/use-character-asset-store";
import { useModelConfigStore } from "@/stores/use-model-config-store";
import { usePromptTemplateStore } from "@/stores/use-prompt-template-store";
import { resolveImageModel } from "@/lib/model-config";

interface GenerateSheetArgs {
  assetId: string;
  model?: GenerateImageInput["model"];
}

export function useGenerateCharacterSheet() {
  const getAsset = useCharacterAssetStore((s) => s.getAsset);
  const setReferenceImages = useCharacterAssetStore(
    (s) => s.setReferenceImages
  );

  return useMutation({
    mutationFn: async ({ assetId, model }: GenerateSheetArgs) => {
      const asset = getAsset(assetId);
      if (!asset) throw new Error("找不到人物資產");

      const result = await generateImage({
        prompt: buildCharacterSheetPrompt(asset, {
          characterSheet: usePromptTemplateStore.getState().overrides["character-sheet"],
          presenterSheet: usePromptTemplateStore.getState().overrides["presenter-sheet"],
        }),
        model:
          model ??
          resolveImageModel(useModelConfigStore.getState().imageModel),
        imageSize: asset.type === "presenter" ? "3:4" : "16:9",
      });
      if (!result.success) throw new Error(result.error);

      // 設定圖固定放在 index 0(重生會覆蓋),其餘為使用者上傳的補充參考
      const key = await saveAssetImage(assetId, 0, result.base64);
      const rest = asset.referenceImageKeys.filter((k) => k !== key);
      setReferenceImages(assetId, [key, ...rest]);

      return { key, base64: result.base64, creditCost: result.creditCost };
    },
  });
}
