"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { Grid3X3, LayoutGrid, Sparkles, Loader2, ImageIcon, Upload, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "./copy-button";
import { buildSeedancePrompt } from "@/lib/seedance-prompt";
import { buildGridPrompt } from "@/lib/storyboard-prompt";
import { useFrameStore } from "@/stores/use-frame-store";
import { useProjectStore } from "@/stores/use-project-store";
import { useGenerateImage } from "@/hooks/use-generate-image";
import { useImageStorage } from "@/hooks/use-image-storage";
import { durationOptions, cameraOptions } from "@/lib/seedance-options";
import { generateNextFrame } from "@/actions/generate-next-frame";
import type { Frame } from "@/lib/schemas";

export function PromptRow({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame);
  const insertFrameAfter = useFrameStore((s) => s.insertFrameAfter);
  const project = useProjectStore((s) => s.getProject(frame.projectId));

  const { imageData, save, remove } = useImageStorage(frame.id);
  const generateMutation = useGenerateImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState(frame.prompt);
  const [speaker, setSpeaker] = useState(frame.speaker ?? "");
  const [dialogue, setDialogue] = useState(frame.dialogue ?? "");
  const promptTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const speakerTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const dialogueTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPrompt(frame.prompt);
    setSpeaker(frame.speaker ?? "");
    setDialogue(frame.dialogue ?? "");
  }, [frame.prompt, frame.speaker, frame.dialogue]);

  function handlePromptChange(value: string) {
    setPrompt(value);
    if (promptTimer.current) clearTimeout(promptTimer.current);
    promptTimer.current = setTimeout(() => {
      updateFrame(frame.id, { prompt: value });
    }, 500);
  }

  function handleSpeakerChange(value: string) {
    setSpeaker(value);
    if (speakerTimer.current) clearTimeout(speakerTimer.current);
    speakerTimer.current = setTimeout(() => {
      updateFrame(frame.id, { speaker: value });
    }, 500);
  }

  function handleDialogueChange(value: string) {
    setDialogue(value);
    if (dialogueTimer.current) clearTimeout(dialogueTimer.current);
    dialogueTimer.current = setTimeout(() => {
      updateFrame(frame.id, { dialogue: value });
    }, 500);
  }

  function handleDurationChange(value: string) {
    updateFrame(frame.id, { duration: Number(value) });
  }

  function handleCameraChange(value: string) {
    updateFrame(frame.id, { cameraMovement: value as Frame["cameraMovement"] });
  }

  const liveFrame: Frame = { ...frame, prompt, speaker, dialogue };
  const seedancePrompt = buildSeedancePrompt(liveFrame);

  async function handleGenerate() {
    if (!prompt) {
      toast.error("請先填寫場景描述");
      return;
    }
    try {
      const result = await generateMutation.mutateAsync({
        prompt,
        model: "gemini-2.5-flash-image",
        imageSize: "16:9",
      });
      await save(result.base64);
      updateFrame(frame.id, { imageBase64Key: `image-${frame.id}` });
      toast.success("生圖完成");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生圖失敗");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("圖片不可超過 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await save(base64);
      updateFrame(frame.id, { imageBase64Key: `image-${frame.id}` });
      toast.success("圖片上傳成功");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleDownload() {
    if (!imageData) return;
    const a = document.createElement("a");
    a.href = imageData;
    a.download = `frame-${frame.order + 1}.png`;
    a.click();
  }

  async function handleRemoveImage() {
    await remove();
    updateFrame(frame.id, { imageBase64Key: undefined });
    toast.success("圖片已移除");
  }

  function handleGenerateNext() {
    startTransition(async () => {
      const result = await generateNextFrame({
        currentPrompt: prompt,
        currentDialogue: dialogue,
        currentSpeaker: speaker,
        projectDescription: project?.description ?? "",
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      insertFrameAfter(frame.id, {
        prompt: result.prompt,
        dialogue: result.dialogue,
        speaker: result.speaker,
      });
      toast.success(`已在 #${frame.order + 1} 後插入新分鏡`);
    });
  }

  async function handleCopyGrid(size: 9 | 25) {
    const gridPrompt = buildGridPrompt([liveFrame], size);
    await navigator.clipboard.writeText(gridPrompt);
    toast.success(`已複製 #${frame.order + 1} 的 ${size} 宮格 Prompt`);
  }

  return (
    <Card className="overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      <div className="flex gap-3 p-3">
        {/* 左：序號 + 圖片 + 控制 */}
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {frame.order + 1}
          </span>

          {/* 圖片區 */}
          <div className="group relative h-20 w-32 overflow-hidden rounded bg-muted">
            {generateMutation.isPending ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">生成中...</span>
              </div>
            ) : imageData ? (
              <>
                <img src={imageData} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={handleRemoveImage}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ImageIcon className="h-5 w-5" />
                <span className="text-[9px]">上傳圖片</span>
              </button>
            )}
          </div>

          {/* 生圖按鈕 */}
          <Button
            variant="secondary"
            size="sm"
            className="h-6 w-32 text-[10px]"
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !prompt}
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <ImageIcon className="mr-1 h-3 w-3" />
            )}
            {generateMutation.isPending ? "生成中" : "AI 生圖"}
          </Button>

          <Select value={String(frame.duration)} onValueChange={handleDurationChange}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={frame.cameraMovement} onValueChange={handleCameraChange}>
            <SelectTrigger className="h-7 w-32 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cameraOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 右：內容 */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* 生圖 Prompt → Gemini */}
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                生圖
              </span>
              <CopyButton text={prompt} />
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleCopyGrid(9)}>
                <Grid3X3 className="mr-1 h-3 w-3" />
                9格
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleCopyGrid(25)}>
                <LayoutGrid className="mr-1 h-3 w-3" />
                25格
              </Button>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="場景描述..."
              rows={2}
              className="resize-none text-xs leading-relaxed"
            />
          </div>

          <hr className="border-dashed" />

          {/* Seedance → 台詞 + 提示詞 */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                Seedance
              </span>
              <CopyButton text={seedancePrompt} />
            </div>
            <div className="mb-1.5 flex gap-1.5">
              <Input
                value={speaker}
                onChange={(e) => handleSpeakerChange(e.target.value)}
                placeholder="說話者"
                className="h-7 w-20 shrink-0 text-xs"
              />
              <Input
                value={dialogue}
                onChange={(e) => handleDialogueChange(e.target.value)}
                placeholder="輸入台詞..."
                className="h-7 text-xs"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {seedancePrompt}
            </p>
          </div>
        </div>
      </div>

      {/* AI 生成並插入下一個分鏡 */}
      <div className="flex justify-end border-t px-3 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
          onClick={handleGenerateNext}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isPending ? "生成中..." : "AI 插入下一鏡"}
        </Button>
      </div>
    </Card>
  );
}
