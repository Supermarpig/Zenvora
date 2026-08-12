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

export type VideoUiStatus = "none" | "running" | "succeeded" | "failed";

export function useVideoGeneration(frameId: string) {
  const frame = useFrameStore((s) => s.getFrame(frameId));
  const updateFrame = useFrameStore((s) => s.updateFrame);
  const job = useJobStore((s) => s.jobs[frameId]);
  const startJob = useJobStore((s) => s.startJob);
  const setJobStatus = useJobStore((s) => s.setJobStatus);
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
    enabled: !!job && job.status === "running",
    refetchInterval: (q) =>
      q.state.data?.status === "running" ? 5000 : false,
    queryFn: async () => {
      if (!job) return { status: "none" as const };
      const res = await getVideoJob(job.providerId, job.providerJobId);
      if (!res.success)
        return { status: "failed" as const, error: res.error };
      return res.job;
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
      completedRef.current = true;
      const uri = data.videoUri;
      (async () => {
        try {
          const res = await fetch(
            `/api/video/download?uri=${encodeURIComponent(uri)}`
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
          setJobStatus(frameId, "failed", msg);
          updateFrame(frameId, { videoStatus: "failed", videoError: msg });
        }
      })();
    } else if (data.status === "failed" && job.status === "running") {
      const msg = "error" in data ? data.error : "生成失敗";
      setJobStatus(frameId, "failed", msg);
      updateFrame(frameId, { videoStatus: "failed", videoError: msg });
    }
  }, [poll.data, job, frameId, updateFrame, removeJob, setJobStatus]);

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
    if (job?.status !== "running") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [job?.status]);

  const status: VideoUiStatus =
    job?.status === "running"
      ? "running"
      : videoKey
      ? "succeeded"
      : localError || frame?.videoStatus === "failed"
      ? "failed"
      : "none";

  const elapsedSec =
    job?.status === "running"
      ? Math.max(0, Math.floor((now - new Date(job.createdAt).getTime()) / 1000))
      : 0;

  return {
    status,
    videoUrl,
    isSubmitting,
    elapsedSec,
    error: localError ?? job?.error ?? frame?.videoError ?? null,
    generate,
    removeVideo,
  };
}
