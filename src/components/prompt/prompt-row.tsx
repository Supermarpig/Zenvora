"use client";

import { useEffect, useState } from "react";
import { Grid3X3, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";
import { loadImage } from "@/lib/db";
import { buildSeedancePrompt } from "@/lib/seedance-prompt";
import { buildGridPrompt } from "@/lib/storyboard-prompt";
import type { Frame } from "@/lib/schemas";

export function PromptRow({ frame }: { frame: Frame }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const seedancePrompt = buildSeedancePrompt(frame);

  async function handleCopyGrid(size: 9 | 25) {
    const prompt = buildGridPrompt([frame], size);
    await navigator.clipboard.writeText(prompt);
    toast.success(`已複製分鏡 #${frame.order + 1} 的 ${size} 宮格 Prompt`);
  }

  useEffect(() => {
    if (frame.imageBase64Key) {
      loadImage(frame.id).then((img) => setThumbnail(img ?? null));
    }
  }, [frame.imageBase64Key, frame.id]);

  return (
    <TableRow>
      <TableCell className="w-12 text-center font-medium align-top pt-4">
        {frame.order + 1}
      </TableCell>
      <TableCell className="w-24 align-top pt-4">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`分鏡 #${frame.order + 1}`}
            className="h-14 w-24 rounded object-cover"
          />
        ) : (
          <div className="flex h-14 w-24 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
            無圖片
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                生圖 Prompt
              </span>
              <CopyButton text={frame.prompt} />
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {frame.prompt}
            </p>
          </div>

          {(frame.speaker || frame.dialogue) && (
            <div>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                台詞
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                {frame.speaker && (
                  <span className="font-medium text-foreground">{frame.speaker}：</span>
                )}
                {frame.dialogue}
              </p>
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                Seedance 提示詞
              </span>
              <CopyButton text={seedancePrompt} />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {seedancePrompt}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => handleCopyGrid(9)}>
              <Grid3X3 className="mr-1.5 h-3.5 w-3.5" />
              複製 9 宮格 Prompt
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleCopyGrid(25)}>
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              複製 25 宮格 Prompt
            </Button>
          </div>
        </div>
      </TableCell>
      <TableCell className="w-20 text-center align-top pt-4">
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{frame.duration}s</p>
          <p>{frame.cameraMovement}</p>
          <p>{frame.style}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}
