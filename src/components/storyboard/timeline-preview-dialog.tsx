"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GalleryHorizontalEnd, Play, Pause, SkipBack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolButton } from "./tool-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFrameStore } from "@/stores/use-frame-store";
import { loadImage, loadVideo } from "@/lib/db";
import {
  buildTimeline,
  type ExportTimeline,
  type FrameAssetFlags,
} from "@/lib/timeline-export";
import type { Frame } from "@/lib/schemas";

interface ClipMedia {
  imageUrl?: string;
  videoUrl?: string;
}

/** 影片生成任務狀態,與素材有無是兩件事(失敗的鏡次也可能還留著舊圖) */
type RenderStatus = NonNullable<Frame["videoStatus"]>;

const RENDER_LABELS: Record<RenderStatus, string> = {
  none: "未開始",
  queued: "排隊中",
  running: "生成中",
  succeeded: "已完成",
  failed: "失敗",
};

/**
 * 時間軸預覽與依序播放。
 *
 * 刻意複用 `buildTimeline` 而不自己算一份 —— 預覽顯示的區間必須與「導出剪映」
 * 產生的 timeline.json 完全一致,否則預覽看起來對、進剪映卻歪掉。
 */
export function TimelinePreviewDialog({
  projectId,
  projectName,
  rail,
}: {
  projectId: string;
  projectName: string;
  rail?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [timeline, setTimeline] = useState<ExportTimeline | null>(null);
  const [media, setMedia] = useState<ClipMedia[]>([]);
  const [statuses, setStatuses] = useState<RenderStatus[]>([]);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const getFramesByProject = useFrameStore((s) => s.getFramesByProject);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const revokeUrls = useCallback(() => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
  }, []);

  async function handleOpen() {
    const frames = getFramesByProject(projectId);
    const flags: Record<string, FrameAssetFlags> = {};
    const loaded: ClipMedia[] = [];

    revokeUrls();
    for (const frame of frames) {
      const [image, video] = await Promise.all([
        loadImage(frame.id),
        loadVideo(frame.id),
      ]);
      flags[frame.id] = {
        imageExt: image ? "png" : undefined,
        hasVideo: Boolean(video),
      };
      let videoUrl: string | undefined;
      if (video) {
        videoUrl = URL.createObjectURL(video);
        objectUrlsRef.current.push(videoUrl);
      }
      loaded.push({ imageUrl: image, videoUrl });
    }

    setMedia(loaded);
    setStatuses(frames.map((f) => f.videoStatus ?? "none"));
    setTimeline(buildTimeline(projectName, frames, flags, new Date().toISOString()));
    setCurrent(0);
    setPlaying(false);
    setOpen(true);
  }

  /**
   * 推進到下一鏡,到底了就停。
   * 只從事件(timer / video ended)呼叫 —— 放在 effect body 裡同步 setState
   * 會觸發 cascading render,ESLint 也會擋。
   */
  const advance = useCallback(() => {
    if (!timeline) return;
    if (current + 1 < timeline.clips.length) setCurrent(current + 1);
    else setPlaying(false);
  }, [current, timeline]);

  // 播放推進:有影片交給 video 的 ended 事件,其餘用該鏡時長計時
  useEffect(() => {
    clearTimer();
    if (!playing || !timeline) return;

    const clip = timeline.clips[current];
    if (!clip) return;
    if (media[current]?.videoUrl) return; // 由 <video onEnded> 推進

    timerRef.current = setTimeout(advance, clip.durationSec * 1000);
    return clearTimer;
  }, [playing, current, timeline, media, advance]);

  useEffect(() => revokeUrls, [revokeUrls]);

  const clip = timeline?.clips[current];
  const activeMedia = media[current];

  return (
    <>
      <ToolButton
        icon={GalleryHorizontalEnd}
        label="時間軸"
        rail={rail}
        onClick={handleOpen}
      />

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setPlaying(false);
            clearTimer();
          }
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>時間軸</DialogTitle>
            <DialogDescription>
              區間與「導出剪映」的 timeline.json 同一份資料算出，所以這裡看到的就是進剪映後的排列。
            </DialogDescription>
          </DialogHeader>

          {timeline && timeline.clips.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              尚無分鏡
            </p>
          )}

          {timeline && timeline.clips.length > 0 && (
            <div className="space-y-4 py-1">
              <div className="flex items-center justify-between text-sm">
                <span>
                  共 {timeline.clips.length} 鏡 · 總長 {timeline.totalDurationSec} 秒
                </span>
                <span className="text-muted-foreground">
                  {timeline.fps}fps · {timeline.project}
                </span>
              </div>

              {/* 渲染追蹤:任務狀態與「素材有無」是兩件事,失敗的鏡次可能還留著舊圖 */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                {(Object.keys(RENDER_LABELS) as RenderStatus[])
                  .map((st) => ({
                    st,
                    count: statuses.filter((s) => s === st).length,
                  }))
                  .filter((x) => x.count > 0)
                  .map(({ st, count }) => (
                    <span
                      key={st}
                      className={
                        st === "failed"
                          ? "font-medium text-destructive"
                          : st === "running" || st === "queued"
                            ? "font-medium text-amber-600 dark:text-amber-500"
                            : "text-muted-foreground"
                      }
                    >
                      {RENDER_LABELS[st]} {count}
                    </span>
                  ))}
              </div>

              {/* 水平 gantt:寬度正比於時長,缺素材的鏡次用虛線標出 */}
              <div className="flex h-12 w-full overflow-hidden rounded-lg border">
                {timeline.clips.map((c, i) => {
                  const width = (c.durationSec / timeline.totalDurationSec) * 100;
                  const hasVideo = Boolean(c.videoFile);
                  const hasImage = Boolean(c.imageFile);
                  return (
                    <button
                      key={c.shot}
                      type="button"
                      onClick={() => {
                        setCurrent(i);
                        setPlaying(false);
                      }}
                      style={{ width: `${width}%` }}
                      title={`第 ${c.shot} 鏡 · ${c.startSec}s–${c.startSec + c.durationSec}s · ${RENDER_LABELS[statuses[i] ?? "none"]}`}
                      className={`relative shrink-0 border-r text-[10px] transition-colors last:border-r-0 ${
                        i === current ? "ring-2 ring-inset ring-primary" : ""
                      } ${
                        statuses[i] === "failed"
                          ? "bg-destructive/25 text-destructive hover:bg-destructive/35"
                          : hasVideo
                            ? "bg-primary/70 text-primary-foreground hover:bg-primary"
                            : hasImage
                              ? "bg-primary/25 hover:bg-primary/40"
                              : "border-dashed bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {c.shot}
                      {(statuses[i] === "running" || statuses[i] === "queued") && (
                        <span className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm bg-primary/70" />有影片
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm bg-primary/25" />只有圖
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm border border-dashed bg-muted" />
                  無素材
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm bg-destructive/25" />生成失敗
                </span>
              </div>

              {/* 播放區 */}
              <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
                {activeMedia?.videoUrl ? (
                  <video
                    key={activeMedia.videoUrl}
                    src={activeMedia.videoUrl}
                    autoPlay={playing}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                    onEnded={() => {
                      if (playing) advance();
                    }}
                  />
                ) : activeMedia?.imageUrl ? (
                  <img
                    src={activeMedia.imageUrl}
                    alt={`第 ${clip?.shot} 鏡`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    第 {clip?.shot} 鏡尚無素材
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setPlaying((p) => !p)}
                  disabled={timeline.clips.length === 0}
                >
                  {playing ? (
                    <Pause className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Play className="mr-1.5 h-4 w-4" />
                  )}
                  {playing ? "暫停" : "依序播放"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrent(0);
                    setPlaying(false);
                  }}
                >
                  <SkipBack className="mr-1.5 h-4 w-4" />
                  回到開頭
                </Button>
                {clip && (
                  <p className="text-xs text-muted-foreground">
                    第 {clip.shot} 鏡 · {clip.startSec}s–
                    {clip.startSec + clip.durationSec}s · {clip.camera}
                    {clip.dialogue && ` · ${clip.speaker}：${clip.dialogue}`}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
