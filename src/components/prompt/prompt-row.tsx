"use client";

import { useEffect, useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { CopyButton } from "./copy-button";
import { loadImage } from "@/lib/db";
import { buildSeedancePrompt } from "@/lib/seedance-prompt";
import type { Frame } from "@/lib/schemas";

export function PromptRow({ frame }: { frame: Frame }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const prompt = buildSeedancePrompt(frame);

  useEffect(() => {
    if (frame.imageBase64Key) {
      loadImage(frame.id).then((img) => setThumbnail(img ?? null));
    }
  }, [frame.imageBase64Key, frame.id]);

  return (
    <TableRow>
      <TableCell className="w-12 text-center font-medium">
        {frame.order + 1}
      </TableCell>
      <TableCell className="w-24">
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
      <TableCell className="max-w-xs">
        <p className="text-sm leading-relaxed">{prompt}</p>
      </TableCell>
      <TableCell className="w-16 text-center">
        {frame.duration}s
      </TableCell>
      <TableCell className="w-12">
        <CopyButton text={prompt} />
      </TableCell>
    </TableRow>
  );
}
