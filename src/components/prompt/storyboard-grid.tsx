"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Grid3X3 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";
import { loadImage } from "@/lib/db";
import { buildFrameGridPrompt } from "@/lib/storyboard-prompt";
import type { Frame } from "@/lib/schemas";

function GridCell({ frame }: { frame: Frame }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (frame.imageBase64Key) {
      loadImage(frame.id).then((img) => setThumbnail(img ?? null));
    }
  }, [frame.imageBase64Key, frame.id]);

  async function handleCopyGridPrompt() {
    const prompt = buildFrameGridPrompt(frame);
    await navigator.clipboard.writeText(prompt);
    toast.success(`已複製分鏡 #${frame.order + 1} 的 9 宮格 Prompt`);
  }

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video w-full bg-muted">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`分鏡 #${frame.order + 1}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {frame.order + 1}
            </span>
            <span className="text-xs text-muted-foreground">
              {frame.duration}s · {frame.cameraMovement}
            </span>
          </div>
          <CopyButton text={frame.prompt} />
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed">
          {frame.prompt}
        </p>

        {(frame.speaker || frame.dialogue) && (
          <div className="rounded bg-muted/50 px-2 py-1.5">
            <p className="text-xs text-muted-foreground">
              {frame.speaker && (
                <span className="font-semibold text-foreground">
                  {frame.speaker}：
                </span>
              )}
              <span className="line-clamp-2">{frame.dialogue}</span>
            </p>
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={handleCopyGridPrompt}
        >
          <Grid3X3 className="mr-1.5 h-3.5 w-3.5" />
          複製 9 宮格 Prompt
        </Button>
      </div>
    </Card>
  );
}

interface StoryboardGridProps {
  frames: Frame[];
}

export function StoryboardGrid({ frames }: StoryboardGridProps) {
  if (frames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-lg font-medium">尚無分鏡</p>
        <p className="text-muted-foreground">
          請先回到畫布新增分鏡並填寫場景描述
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        每個分鏡都可以「複製 9 宮格 Prompt」→ 貼到 Gemini 生成該場景的 3x3 分鏡圖 → 上傳到 Seedance 生成影片
      </p>
      <div className="grid grid-cols-3 gap-4">
        {frames.map((frame) => (
          <GridCell key={frame.id} frame={frame} />
        ))}
      </div>
    </div>
  );
}
