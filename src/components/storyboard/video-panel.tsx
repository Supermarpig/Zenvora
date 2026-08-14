"use client";

import { useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Loader2,
  Trash2,
  Volume2,
  VolumeX,
  AlertTriangle,
  RotateCcw,
  Upload,
  X,
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
import {
  loadImage,
  loadEndImage,
  saveEndImage,
  deleteEndImage,
  getEndImageKey,
} from "@/lib/db";
import {
  VIDEO_MODELS,
  getModelOption,
  snapDuration,
  supportedAspects,
} from "@/lib/video";
import type { VideoAspectRatio, VideoMode } from "@/lib/video/types";
import { useModelConfigStore } from "@/stores/use-model-config-store";
import { resolveVideoModel } from "@/lib/model-config";
import { usePromptTemplateStore } from "@/stores/use-prompt-template-store";

const ASPECT_OPTIONS: { value: VideoAspectRatio; label: string }[] = [
  { value: "16:9", label: "16:9 橫向" },
  { value: "9:16", label: "9:16 直向" },
  { value: "1:1", label: "1:1 方形" },
];

/**
 * 生成鏈路。`auto` 是預設,行為與先前完全一致(有關鍵幀走 i2v、沒有走 t2v);
 * 明確選 i2v/t2v 則不再自動退讓 —— 選了 i2v 卻沒有關鍵幀會直接報錯,
 * 而不是靜默改走 t2v 燒掉額度。
 */
type LinkChoice = "auto" | VideoMode;

const LINK_OPTIONS: { value: LinkChoice; label: string }[] = [
  { value: "auto", label: "自動選鏈路（有關鍵幀就圖生）" },
  { value: "i2v", label: "圖生影片 i2v（品質優先）" },
  { value: "t2v", label: "文生影片 t2v（無圖出草稿）" },
];

interface VideoPanelProps {
  frameId: string;
}

export function VideoPanel({ frameId }: VideoPanelProps) {
  const frame = useFrameStore((s) => s.getFrame(frameId));
  const updateFrame = useFrameStore((s) => s.updateFrame);
  const { status, videoUrl, isSubmitting, elapsedSec, error, generate, removeVideo } =
    useVideoGeneration(frameId);

  const configuredVideoModel = useModelConfigStore((s) => s.videoModel);
  // 設定頁的選擇當預設值,面板上仍可臨時改單次生成用的引擎
  const [model, setModel] = useState<string>(() =>
    resolveVideoModel(configuredVideoModel)
  );
  const [aspect, setAspect] = useState<VideoAspectRatio>("16:9");
  const [withAudio, setWithAudio] = useState(false);
  const [hasImage, setHasImage] = useState<boolean | null>(null);
  const [link, setLink] = useState<LinkChoice>("auto");
  const [endImage, setEndImage] = useState<string | null>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    loadImage(frameId).then((img) => alive && setHasImage(!!img));
    return () => {
      alive = false;
    };
  }, [frameId, status]);

  // 結束幀存在 IndexedDB,切換分鏡要重新載入
  useEffect(() => {
    let alive = true;
    loadEndImage(frameId).then((img) => alive && setEndImage(img ?? null));
    return () => {
      alive = false;
    };
  }, [frameId]);

  const running = status === "running";
  const option = getModelOption(model);
  const supportsEndFrame = !!option?.supportsEndFrame;
  const allowedAspects = supportedAspects(model);
  const aspectOptions = ASPECT_OPTIONS.filter((a) =>
    allowedAspects.includes(a.value)
  );
  // 換引擎後原本選的比例可能不再支援(例:1:1 換到 Veo),送出前用第一個可用的
  const effectiveAspect = allowedAspects.includes(aspect)
    ? aspect
    : allowedAspects[0];
  // 引擎對秒數有限制時(Veo 只吃 4/6/8)顯示實際會送出的值
  const effectiveDuration = frame
    ? snapDuration(model, Math.min(15, Math.max(2, frame.duration)))
    : 0;

  async function handleGenerate() {
    if (!frame) return;
    if (!frame.prompt?.trim()) {
      toast.error("請先填寫場景描述");
      return;
    }
    const img = await loadImage(frameId);
    const mode: VideoMode = link === "auto" ? (img ? "i2v" : "t2v") : link;

    if (mode === "i2v" && !img) {
      toast.error(
        "圖生影片需要關鍵幀圖 —— 請先生成起始幀，或改選「文生影片 t2v」"
      );
      return;
    }
    if (mode === "i2v" && !getModelOption(model)?.supportsImage) {
      toast.error("這個引擎不支援圖生影片，請改選其他引擎或用文生影片");
      return;
    }

    const r = await generate({
      mode,
      // t2v 沒有參考圖,prompt 裡那句「必須符合參考圖」要拿掉
      prompt: buildVeoPrompt(frame, {
        mute: !withAudio,
        hasReferenceImage: mode === "i2v",
        fragments: usePromptTemplateStore.getState().fragments,
      }),
      imageDataUrl: mode === "i2v" ? (img ?? undefined) : undefined,
      // 結束幀只在 i2v 且引擎支援時送(action 那層還會再擋一次)
      endImageDataUrl:
        mode === "i2v" && supportsEndFrame && endImage ? endImage : undefined,
      aspectRatio: effectiveAspect,
      durationSec: effectiveDuration,
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

  async function handlePickEndImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("圖片大小不可超過 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await saveEndImage(frameId, dataUrl);
      setEndImage(dataUrl);
      // frameSchema 的 endImageKey 只當「有沒有結束幀」的標記,實際載入走 loadEndImage
      updateFrame(frameId, { endImageKey: getEndImageKey(frameId) });
      toast.success("已設定結束幀");
    };
    reader.readAsDataURL(file);
  }

  async function handleClearEndImage() {
    await deleteEndImage(frameId);
    setEndImage(null);
    updateFrame(frameId, { endImageKey: undefined });
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
              {link === "t2v"
                ? "文生影片：不使用關鍵幀圖"
                : link === "i2v"
                ? hasImage === false
                  ? "圖生影片：尚無關鍵幀圖，需先生成起始幀"
                  : "以關鍵幀圖生成影片"
                : hasImage === false
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

          <Select
            value={link}
            onValueChange={(v) => setLink(v as LinkChoice)}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LINK_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={effectiveAspect}
              onValueChange={(v) => setAspect(v as VideoAspectRatio)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aspectOptions.map((a) => (
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

          {/* 結束幀:只有支援的引擎才出現,而且只在會走 i2v 時有意義。
              沒有起始幀時整段藏起來 —— 「插值到終點」需要有起點。 */}
          {supportsEndFrame && link !== "t2v" && hasImage && (
            <div className="space-y-1.5 rounded-lg border bg-background/60 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">
                  結束幀（選填）
                </span>
                <span className="text-[10px] text-muted-foreground">
                  設了就從起始幀插值到它
                </span>
              </div>

              <input
                ref={endInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePickEndImage}
              />

              {endImage ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={endImage}
                    alt="結束幀"
                    className="h-12 w-20 rounded border object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleClearEndImage}
                  >
                    <X className="mr-1 h-3 w-3" />
                    移除
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-full text-xs"
                  onClick={() => endInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 h-3 w-3" />
                  上傳結束幀
                </Button>
              )}
            </div>
          )}

          {/* 引擎把秒數吸附掉時要講出來,否則使用者以為設 5 秒就是 5 秒 */}
          {frame && effectiveDuration !== frame.duration && (
            <p className="text-[11px] text-amber-600 dark:text-amber-500">
              這個引擎只接受 {option?.allowedDurations?.join(" / ")} 秒，
              分鏡設的 {frame.duration}s 會以 {effectiveDuration}s 送出。
            </p>
          )}
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
        AI、即夢→火山 JIMENG_AK/SK、Kling→KLING_ACCESS_KEY/SECRET_KEY)。
      </p>
    </div>
  );
}
