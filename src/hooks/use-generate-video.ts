"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  generateVideo,
  getVideoJob,
  type GenerateVideoInput,
} from "@/actions/generate-video";
import { useFrameStore } from "@/stores/use-frame-store";
import { useJobStore } from "@/stores/use-job-store";
import { saveVideo, loadVideo, deleteVideo, getVideoKey } from "@/lib/db";
import { deriveVideoStatus } from "@/lib/video-status";

// 型別的家搬到 @/lib/video-status(推導的唯一來源);re-export 讓既有 import 路徑不變
export type { VideoUiStatus } from "@/lib/video-status";

/**
 * 正在下載成片的 frameId(module 層,跨 hook 實例共享)。
 * 影片面板與 App 層 VideoJobPoller 可能同時為同一鏡掛 hook、同時處理「完成」,
 * 用這個 Set 去重,避免對同一段影片下載/存檔兩次。
 */
const inFlightDownloads = new Set<string>();

export function useVideoGeneration(frameId: string) {
  const frame = useFrameStore((s) => s.getFrame(frameId));
  const updateFrame = useFrameStore((s) => s.updateFrame);
  const job = useJobStore((s) => s.jobs[frameId]);
  const startJob = useJobStore((s) => s.startJob);
  const removeJob = useJobStore((s) => s.removeJob);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const completedRef = useRef(false);

  const videoKey = frame?.videoKey;

  // 載入 IndexedDB 既有影片
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    if (videoKey) {
      loadVideo(frameId).then((blob) => {
        if (alive && blob) {
          url = URL.createObjectURL(blob);
          setVideoUrl(url);
        }
      });
    } else {
      setVideoUrl(null);
    }
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [videoKey, frameId]);

  // 輪詢
  const poll = useQuery({
    queryKey: ["video-job", frameId, job?.providerJobId],
    // job 存在 == 有在跑(終態會 removeJob),所以這就是「該不該輪詢」的唯一訊號
    enabled: !!job,
    refetchInterval: (q) =>
      q.state.data?.status === "running" ? 5000 : false,
    queryFn: async () => {
      if (!job) return { status: "none" as const };
      const res = await getVideoJob(job.providerId, job.providerJobId);
      if (!res.success)
        return { status: "failed" as const, error: res.error };
      // 帶上 needsProxyDownload,讓完成時決定直抓(本機 ComfyUI)或走代理(雲端帶 key)
      return { ...res.job, needsProxyDownload: res.needsProxyDownload };
    },
  });

  // 處理完成 / 失敗
  useEffect(() => {
    const data = poll.data;
    if (!job || !data) return;

    if (
      data.status === "succeeded" &&
      "videoUri" in data &&
      data.videoUri &&
      !completedRef.current
    ) {
      // 別的實例(面板/輪詢器)已在下載這一鏡 → 早退,不重複抓
      if (inFlightDownloads.has(frameId)) return;
      completedRef.current = true;
      inFlightDownloads.add(frameId);
      const uri = data.videoUri;
      // 本機 ComfyUI 的 /view 已開 CORS,前端直抓;雲端 provider 走 /api/video 代理帶 key。
      // needsProxyDownload 缺省時保守走代理(維持既有行為)。
      const needsProxy =
        "needsProxyDownload" in data ? data.needsProxyDownload !== false : true;
      (async () => {
        try {
          const res = await fetch(
            needsProxy
              ? `/api/video/download?uri=${encodeURIComponent(uri)}`
              : uri
          );
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(j.error ?? "下載失敗");
          }
          const blob = await res.blob();
          await saveVideo(frameId, blob);
          setVideoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
          updateFrame(frameId, {
            videoKey: getVideoKey(frameId),
            videoStatus: "succeeded",
            videoModel: job.model,
            videoError: undefined,
          });
          removeJob(frameId);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "下載失敗";
          setLocalError(msg);
          updateFrame(frameId, { videoStatus: "failed", videoError: msg });
          removeJob(frameId);
        } finally {
          inFlightDownloads.delete(frameId);
        }
      })();
    } else if (data.status === "failed") {
      const msg = "error" in data ? data.error : "生成失敗";
      // 錯誤透過 frame.videoError 呈現(單一真相);removeJob 讓下一次 render 早退不重複處理
      updateFrame(frameId, { videoStatus: "failed", videoError: msg });
      removeJob(frameId);
    }
  }, [poll.data, job, frameId, updateFrame, removeJob]);

  const generate = useCallback(
    async (input: GenerateVideoInput) => {
      setIsSubmitting(true);
      setLocalError(null);
      completedRef.current = false;
      try {
        const res = await generateVideo(input);
        if (!res.success) {
          setLocalError(res.error);
          updateFrame(frameId, {
            videoStatus: "failed",
            videoError: res.error,
          });
          return { ok: false as const, error: res.error };
        }
        startJob({
          frameId,
          providerId: res.providerId,
          providerJobId: res.providerJobId,
          model: input.model,
        });
        updateFrame(frameId, {
          videoStatus: "running",
          videoModel: input.model,
          videoError: undefined,
        });
        return { ok: true as const, creditCost: res.creditCost };
      } finally {
        setIsSubmitting(false);
      }
    },
    [frameId, startJob, updateFrame]
  );

  const removeVideo = useCallback(async () => {
    await deleteVideo(frameId);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    updateFrame(frameId, {
      videoKey: undefined,
      videoStatus: "none",
      videoModel: undefined,
      videoError: undefined,
    });
    removeJob(frameId);
  }, [frameId, updateFrame, removeJob]);

  // 計時
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!job) return; // job 存在即代表在跑
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [job]);

  // 狀態的唯一推導來源:frame.videoStatus(持久真相)+ 有無成片檔 + 即時錯誤
  const status = deriveVideoStatus({
    videoStatus: frame?.videoStatus,
    hasVideoKey: !!videoKey,
    localError: !!localError,
  });

  const elapsedSec = job
    ? Math.max(0, Math.floor((now - new Date(job.createdAt).getTime()) / 1000))
    : 0;

  return {
    status,
    videoUrl,
    isSubmitting,
    elapsedSec,
    error: localError ?? frame?.videoError ?? null,
    generate,
    removeVideo,
  };
}
