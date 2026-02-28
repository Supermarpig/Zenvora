"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { Grid3X3, LayoutGrid, Sparkles, Loader2 } from "lucide-react";
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
import { loadImage } from "@/lib/db";
import { buildSeedancePrompt } from "@/lib/seedance-prompt";
import { buildGridPrompt } from "@/lib/storyboard-prompt";
import { useFrameStore } from "@/stores/use-frame-store";
import { useProjectStore } from "@/stores/use-project-store";
import { durationOptions, cameraOptions } from "@/lib/seedance-options";
import { generateNextFrame } from "@/actions/generate-next-frame";
import type { Frame } from "@/lib/schemas";

export function PromptRow({ frame }: { frame: Frame }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const updateFrame = useFrameStore((s) => s.updateFrame);
  const allFrames = useFrameStore((s) => s.frames);
  const project = useProjectStore((s) => s.getProject(frame.projectId));

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

  const nextFrame = allFrames.find(
    (f) => f.projectId === frame.projectId && f.order === frame.order + 1
  );

  function handleGenerateNext() {
    if (!nextFrame) {
      toast.error("這是最後一個分鏡，沒有下一個可以填入");
      return;
    }

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

      updateFrame(nextFrame.id, {
        prompt: result.prompt,
        dialogue: result.dialogue,
        speaker: result.speaker,
      });
      toast.success(`已為分鏡 #${nextFrame.order + 1} 生成內容`);
    });
  }

  async function handleCopyGrid(size: 9 | 25) {
    const gridPrompt = buildGridPrompt([liveFrame], size);
    await navigator.clipboard.writeText(gridPrompt);
    toast.success(`已複製 #${frame.order + 1} 的 ${size} 宮格 Prompt`);
  }

  useEffect(() => {
    if (frame.imageBase64Key) {
      loadImage(frame.id).then((img) => setThumbnail(img ?? null));
    }
  }, [frame.imageBase64Key, frame.id]);

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* 左：序號 + 縮圖 */}
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {frame.order + 1}
          </span>
          <div className="h-16 w-28 overflow-hidden rounded bg-muted">
            {thumbnail ? (
              <img src={thumbnail} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                無圖片
              </div>
            )}
          </div>
          <Select
            value={String(frame.duration)}
            onValueChange={handleDurationChange}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
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
          <Select
            value={frame.cameraMovement}
            onValueChange={handleCameraChange}
          >
            <SelectTrigger className="h-7 w-28 text-[10px]">
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

      {/* AI 生成下一個分鏡 */}
      {nextFrame && (
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
            {isPending ? "生成中..." : `AI 生成下一鏡 #${nextFrame.order + 1}`}
          </Button>
        </div>
      )}
    </Card>
  );
}
