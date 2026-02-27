"use client";

import { memo, useEffect, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ImageIcon } from "lucide-react";
import { loadImage } from "@/lib/db";

export type FrameNodeData = {
  frameId: string;
  order: number;
  prompt: string;
  imageBase64Key?: string;
  isSelected: boolean;
};

type FrameNodeType = Node<FrameNodeData, "frame">;

function FrameNodeComponent({ data }: NodeProps<FrameNodeType>) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (data.imageBase64Key) {
      loadImage(data.frameId).then((img) => setThumbnail(img ?? null));
    } else {
      setThumbnail(null);
    }
  }, [data.imageBase64Key, data.frameId]);

  return (
    <>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />
      <div
        className={`
          w-48 rounded-lg border-2 bg-card shadow-sm transition-all cursor-pointer
          ${data.isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}
        `}
      >
        <div className="aspect-video w-full overflow-hidden rounded-t-md bg-muted">
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
