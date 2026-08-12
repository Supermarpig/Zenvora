"use client";

import { useEffect, useState } from "react";
import {
  Clapperboard,
  Loader2,
  Trash2,
  Volume2,
  VolumeX,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFrameStore } from "@/stores/use-frame-store";
import { useVideoGeneration } from "@/hooks/use-generate-video";
import { buildVeoPrompt } from "@/lib/veo-prompt";
import { loadImage } from "@/lib/db";
import {
  VIDEO_MODELS,
  DEFAULT_VIDEO_MODEL,
  getModelOption,
} from "@/lib/video";
import type { VideoAspectRatio } from "@/lib/video/types";

const ASPECT_OPTIONS: { value: VideoAspectRatio; label: string }[] = [
  { value: "16:9", label: "16:9 橫向" },
  { value: "9:16", label: "9:16 直向" },
  { value: "1:1", label: "1:1 方形" },
];

interface VideoPanelProps {
  frameId: string;
}

export function VideoPanel({ frameId }: VideoPanelProps) {
  const frame = useFrameStore((s) => s.getFrame(frameId));
  const { status, videoUrl, isSubmitting, elapsedSec, error, generate, removeVideo } =
    useVideoGeneration(frameId);

  const [model, setModel] = useState<string>(DEFAULT_VIDEO_MODEL);
  const [aspect, setAspect] = useState<VideoAspectRatio>("16:9");
  const [withAudio, setWithAudio] = useState(false);
  const [hasImage, setHasImage] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    loadImage(frameId).then((img) => alive && setHasImage(!!img));
    return () => {
      alive = false;
    };
  }, [frameId, status]);

  const running = status === "running";

  async function handleGenerate() {
    if (!frame) return;
    if (!frame.prompt?.trim()) {
      toast.error("請先填寫場景描述");
      return;
    }
    const img = await loadImage(frameId);
    const mode = img ? "i2v" : "t2v";
    const r = await generate({
      mode,
      prompt: buildVeoPrompt(frame, { mute: !withAudio }),
      imageDataUrl: img ?? undefined,
      aspectRatio: aspect,
      durationSec: Math.min(15, Math.max(2, frame.duration)),
      withAudio,
      model,
    });
    if (r.ok) {
      toast.success(
        `已送出影片任務（${mode === "i2v" ? "圖生影片" : "文生影片"}），預估 ${
          r.creditCost
        } credits`
      );
    } else {
      toast.error(r.error);
    }
  }

  const creditCost = getModelOption(model)?.creditCost ?? 0;

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Clapperboard className="h-4 w-4" />
        影片生成
        <span className="ml-auto text-[11px] font-normal text-muted-foreground">
          {status === "succeeded"
            ? "已完成"
            : running
            ? "生成中"
            : status === "failed"
            ? "失敗"
            : `約 ${creditCost} credits`}
        </span>
      </div>

      {/* 預覽區 */}
      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-background">
        {status === "succeeded" && videoUrl ? (
          <video
            src={videoUrl}
            controls
            loop
            playsInline
            className="h-full w-full bg-black object-contain"
          />
        ) : running ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-xs">生成中… {elapsedSec}s</p>
            <p className="text-[11px] text-muted-foreground/70">
              影片生成通常需 1–3 分鐘，可先去編輯其他分鏡
            </p>
          </div>
        ) : status === "failed" ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-destructive">
            <AlertTriangle className="h-7 w-7" />
            <p className="text-xs leading-relaxed">{error ?? "生成失敗"}</p>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <Clapperboard className="h-8 w-8" />
            <p className="text-xs">
              {hasImage === false
                ? "尚無關鍵幀圖 → 將用文字生成影片"
                : "以關鍵幀圖生成影片"}
            </p>
          </div>
        )}
      </div>

      {/* 設定 */}
      {!running && status !== "succeeded" && (
        <>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_MODELS.map((m) => (
                <SelectItem key={m.model} value={m.model}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={aspect}
              onValueChange={(v) => setAspect(v as VideoAspectRatio)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="text-xs"
              onClick={() => setWithAudio((v) => !v)}
            >
              {withAudio ? (
                <Volume2 className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <VolumeX className="mr-1.5 h-3.5 w-3.5" />
              )}
              {withAudio ? "含台詞/音訊" : "靜音（僅環境音）"}
            </Button>
          </div>
        </>
      )}

      {/* 動作 */}
      <div className="flex gap-2">
        {status === "succeeded" ? (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleGenerate}
              disabled={isSubmitting}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              重新生成
            </Button>
            <Button variant="outline" size="icon" onClick={removeVideo}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            className="flex-1"
            onClick={handleGenerate}
            disabled={isSubmitting || running || !frame?.prompt}
          >
            {isSubmitting || running ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Clapperboard className="mr-1.5 h-4 w-4" />
            )}
            {running ? "生成中…" : status === "failed" ? "重試" : "生成影片"}
          </Button>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        任務在雲端執行,關閉面板不影響。各引擎需在 .env 設好對應金鑰(Veo→Google
        AI、Seedance→火山 JIMENG_AK/SK)。
      </p>
    </div>
  );
}
