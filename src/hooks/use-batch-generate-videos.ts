"use client";

import { useState } from "react";
import { generateVideo } from "@/actions/generate-video";
import { loadImage } from "@/lib/db";
import { buildVeoPrompt } from "@/lib/veo-prompt";
import { useModelConfigStore } from "@/stores/use-model-config-store";
import { usePromptTemplateStore } from "@/stores/use-prompt-template-store";
import { resolveVideoModel } from "@/lib/model-config";
import { getModelOption, snapDuration, supportedAspects } from "@/lib/video";
import { useFrameStore } from "@/stores/use-frame-store";
import { useJobStore } from "@/stores/use-job-store";

export interface BatchVideoProgress {
  done: number;
  total: number;
}

interface RunOptions {
  model?: string;
  /** 只排「還沒有影片、也沒在跑」的分鏡(預設 true);false = 全部重排 */
  onlyMissing?: boolean;
}

/**
 * 批次生影片:一次把整個專案的分鏡都「送出」成影片任務(fire-and-forget)。
 *
 * 與批次生圖不同 —— 影片是**非同步**的:這裡只負責 submit + startJob,實際
 * 完成後的下載存檔由 App 層的 VideoJobPoller 處理(不綁面板)。所以本 hook
 * 送完就返回,不等生成。ComfyUI 會把多個任務排隊依序跑。
 */
export function useBatchGenerateVideos(projectId: string) {
  const [progress, setProgress] = useState<BatchVideoProgress | null>(null);
  const startJob = useJobStore((s) => s.startJob);
  const updateFrame = useFrameStore((s) => s.updateFrame);

  async function run(opts: RunOptions = {}) {
    const { onlyMissing = true } = opts;
    const model =
      opts.model ??
      resolveVideoModel(useModelConfigStore.getState().videoModel);
    const option = getModelOption(model);
    const aspects = supportedAspects(model);
    const aspect = aspects.includes("16:9") ? "16:9" : aspects[0];
    const fragments = usePromptTemplateStore.getState().fragments;

    const jobs = useJobStore.getState().jobs;
    const frames = useFrameStore
      .getState()
      .getFramesByProject(projectId)
      .filter((f) => f.prompt?.trim())
      // 跳過已有影片 / 正在跑的
      .filter(
        (f) =>
          !onlyMissing ||
          (f.videoStatus !== "succeeded" && !f.videoKey && !jobs[f.id])
      );

    if (frames.length === 0) {
      return { ok: 0, fail: 0, firstError: undefined as string | undefined };
    }

    setProgress({ done: 0, total: frames.length });
    let ok = 0;
    let fail = 0;
    let firstError: string | undefined;

    for (const f of frames) {
      try {
        const img = await loadImage(f.id);
        const mode = img ? ("i2v" as const) : ("t2v" as const);
        // 引擎只做圖生影片(如本地 LTX)但這鏡沒起始圖 → 跳過,不要靜默生出無關的片
        if (mode === "i2v" && !option?.supportsImage) {
          fail++;
          firstError ??= "此引擎不支援圖生影片";
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
          continue;
        }
        const res = await generateVideo({
          mode,
          prompt: buildVeoPrompt(f, {
            mute: true,
            hasReferenceImage: mode === "i2v",
            fragments,
          }),
          imageDataUrl: mode === "i2v" ? (img ?? undefined) : undefined,
          aspectRatio: aspect,
          durationSec: snapDuration(model, Math.min(15, Math.max(2, f.duration))),
          withAudio: false,
          model,
        });
        if (res.success) {
          startJob({
            frameId: f.id,
            providerId: res.providerId,
            providerJobId: res.providerJobId,
            model,
          });
          updateFrame(f.id, {
            videoStatus: "running",
            videoModel: model,
            videoError: undefined,
          });
          ok++;
        } else {
          fail++;
          firstError ??= res.error;
        }
      } catch (e) {
        fail++;
        firstError ??= e instanceof Error ? e.message : "送出失敗";
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setProgress(null);
    return { ok, fail, firstError };
  }

  return { progress, run, isRunning: progress !== null };
}
