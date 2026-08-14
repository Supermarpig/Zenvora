"use client";

import { memo, useEffect, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ImageIcon, Clapperboard, Loader2 } from "lucide-react";
import { loadImage } from "@/lib/db";

export type FrameNodeData = {
  frameId: string;
  order: number;
  prompt: string;
  hasImage: boolean;
  /** 版本號改變就重讀 IndexedDB(取代先前傳整個 key 字串的做法) */
  imageVersion: number;
  isSelected: boolean;
  hasVideo?: boolean;
  videoStatus?: "none" | "queued" | "running" | "succeeded" | "failed";
};

type FrameNodeType = Node<FrameNodeData, "frame">;

function FrameNodeComponent({ data }: NodeProps<FrameNodeType>) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const p = data.hasImage
      ? loadImage(data.frameId)
      : Promise.resolve<string | undefined>(undefined);
    p.then((img) => {
      if (alive) setThumbnail(img ?? null);
    });
    return () => {
      alive = false;
    };
  }, [data.hasImage, data.imageVersion, data.frameId]);

  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />
      <div
        className={`
          w-48 rounded-lg border-2 bg-card shadow-sm transition-all cursor-pointer
          ${data.isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}
        `}
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-t-md bg-muted">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`分鏡 #${data.order + 1}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          {data.videoStatus === "running" ? (
            <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              生成中
            </span>
          ) : data.hasVideo ? (
            <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-medium text-white">
              <Clapperboard className="h-2.5 w-2.5" />
              影片
            </span>
          ) : null}
        </div>
        <div className="p-2">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {data.order + 1}
            </span>
            <p className="truncate text-xs text-muted-foreground">
              {data.prompt || "尚未填寫場景描述"}
            </p>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2" />
    </>
  );
}

export const FrameNode = memo(FrameNodeComponent);
