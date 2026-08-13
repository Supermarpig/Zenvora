"use client";

import { useState } from "react";
import { generateImage, type GenerateImageInput } from "@/actions/generate-image";
import { saveImage } from "@/lib/db";
import { composeCastPrompt } from "@/lib/cast";
import { useModelConfigStore } from "@/stores/use-model-config-store";
import { usePromptTemplateStore } from "@/stores/use-prompt-template-store";
import { resolveImageModel } from "@/lib/model-config";
import { buildImagePrompt } from "@/lib/veo-prompt";
import { useFrameStore } from "@/stores/use-frame-store";
import { useCharacterAssetStore } from "@/stores/use-character-asset-store";

export interface BatchProgress {
  done: number;
  total: number;
}

interface RunOptions {
  model?: GenerateImageInput["model"];
  imageSize?: GenerateImageInput["imageSize"];
  /** 只生沒有圖的分鏡(預設 true);false = 全部重生 */
  onlyMissing?: boolean;
}

export function useBatchGenerateImages(projectId: string) {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const updateFrame = useFrameStore((s) => s.updateFrame);

  async function run(opts: RunOptions = {}) {
    const {
      model,
      imageSize = "16:9",
      onlyMissing = true,
    } = opts;

    // 取最新 frames / assets(非響應式,執行當下抓)
    const frames = useFrameStore
      .getState()
      .getFramesByProject(projectId)
      .filter((f) => f.prompt?.trim() && (!onlyMissing || !f.imageBase64Key));
    const allAssets = useCharacterAssetStore.getState().assets;
    const imageTemplate = usePromptTemplateStore.getState().overrides.image;
    // 未指定時用設定頁選的模型(再退回內建預設)
    const effectiveModel =
      model ?? resolveImageModel(useModelConfigStore.getState().imageModel);

    if (frames.length === 0) {
      return { ok: 0, fail: 0, firstError: undefined as string | undefined };
    }

    setProgress({ done: 0, total: frames.length });
    let ok = 0;
    let fail = 0;
    let firstError: string | undefined;

    for (const f of frames) {
      try {
        // 與分鏡編輯器、提示詞總表走同一條組句路徑(buildImagePrompt)
        const { prompt, referenceImages } = await composeCastPrompt(
          buildImagePrompt(f, imageTemplate),
          allAssets,
          f.castIds ?? []
        );

        const res = await generateImage({
          prompt,
          model: effectiveModel,
          imageSize,
          referenceImages: referenceImages.length ? referenceImages : undefined,
        });

        if (res.success) {
          await saveImage(f.id, res.base64);
          updateFrame(f.id, {
            imageBase64Key: `image-${f.id}`,
            creditCost: res.creditCost,
          });
          ok++;
        } else {
          fail++;
          firstError ??= res.error;
        }
      } catch (e) {
        fail++;
        firstError ??= e instanceof Error ? e.message : "生圖失敗";
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setProgress(null);
    return { ok, fail, firstError };
  }

  return { progress, run, isRunning: progress !== null };
}
